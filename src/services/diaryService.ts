/**
 * 穿搭日记业务逻辑：日记 CRUD，并在保存时写入穿着记录、更新衣服 wearCount。
 */
import { clothingRepo, diaryRepo, outfitRepo } from '@/repositories';
import { createId } from '@/utils/id';
import { startOfDay } from '@/utils/date';
import type { Clothing, DiaryEntry, Outfit } from '@/models';

/** 日记草稿 */
export interface DiaryDraft {
  /** 穿着日期（毫秒时间戳，内部会归零到当天 0 点） */
  date: number;
  /** 关联搭配 id */
  outfitId?: string;
  /** 直接关联的衣服 id */
  clothingIds: string[];
  /** 天气 */
  weather?: string;
  /** 场合 */
  occasion?: string;
  /** 备注 */
  note?: string;
}

/** 日记详情：日记本体 + 关联的搭配与衣服 */
export interface DiaryDetail {
  /** 日记本体 */
  entry: DiaryEntry;
  /** 关联的搭配（未关联或已被删除时为 undefined） */
  outfit?: Outfit;
  /** 关联的衣服（按 entry.clothingIds 的顺序） */
  clothes: Clothing[];
}

export const diaryService = {
  /**
   * 查询全部日记，按日期倒序。
   * @returns 日记列表
   */
  async list(): Promise<DiaryEntry[]> {
    return diaryRepo.list();
  },

  /**
   * 查询日记详情，同时把关联的搭配与衣服查出来。
   * @param id 日记 id
   * @returns 详情；日记不存在时返回 undefined
   */
  async getDetail(id: string): Promise<DiaryDetail | undefined> {
    const entry = await diaryRepo.getById(id);
    if (!entry) return undefined;

    const [outfit, clothes] = await Promise.all([
      entry.outfitId ? outfitRepo.getById(entry.outfitId) : Promise.resolve(undefined),
      clothingRepo.listByIds(entry.clothingIds)
    ]);

    // listByIds 不保证顺序，这里按 entry.clothingIds 重排，保证展示顺序稳定
    const order = new Map(entry.clothingIds.map((clothingId, index) => [clothingId, index]));
    const sorted = [...clothes].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return {
      entry,
      outfit: outfit && !outfit.deletedAt ? outfit : undefined,
      clothes: sorted
    };
  },

  /**
   * 按日期区间查询日记（日历视图按月取数）。
   * @param from 起始时间戳（含）
   * @param to 结束时间戳（不含）
   * @returns 该区间内的日记
   */
  async listBetween(from: number, to: number): Promise<DiaryEntry[]> {
    const all = await diaryRepo.list();
    return all.filter((entry) => entry.date >= from && entry.date < to);
  },

  /**
   * 查询某天的日记。
   * @param timestamp 当天任意时刻的时间戳
   * @returns 日记或 undefined
   */
  async getByDate(timestamp: number): Promise<DiaryEntry | undefined> {
    return diaryRepo.getByDate(startOfDay(timestamp));
  },

  /**
   * 保存日记：同一天只保留一条；先回滚旧的穿着统计，再按新内容累加。
   * TODO(第二阶段)：由 DiaryEditView 调用。
   * @param draft 日记草稿
   * @returns 保存后的日记
   * @throws 未选择任何衣服或搭配时抛出错误
   */
  async save(draft: DiaryDraft): Promise<DiaryEntry> {
    if (!draft.outfitId && !draft.clothingIds.length) {
      throw new Error('请至少选择一套搭配或一件衣服');
    }

    const date = startOfDay(draft.date);
    const now = Date.now();
    const existing = await diaryRepo.getByDate(date);

    // 先撤销这一天旧的穿着记录，避免重复累加
    await this.revertWearStats(date);

    const entry: DiaryEntry = {
      id: existing?.id ?? createId(),
      date,
      outfitId: draft.outfitId,
      clothingIds: Array.from(new Set(draft.clothingIds)),
      weather: draft.weather?.trim() || undefined,
      occasion: draft.occasion?.trim() || undefined,
      note: draft.note?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await diaryRepo.put(entry);
    await this.applyWearStats(entry);
    return entry;
  },

  /**
   * 删除日记，并撤销其带来的穿着统计。
   * @param id 日记 id
   * @throws 日记不存在时抛出错误
   */
  async remove(id: string): Promise<void> {
    const entry = await diaryRepo.getById(id);
    if (!entry) throw new Error('日记不存在');
    await this.revertWearStats(entry.date);
    await diaryRepo.remove(id);
  },

  /**
   * 为日记中的衣服累加 wearCount 并写入 WearRecord。
   * @param entry 日记
   */
  async applyWearStats(entry: DiaryEntry): Promise<void> {
    if (!entry.clothingIds.length) return;
    const now = Date.now();
    await diaryRepo.bulkPutWearRecords(
      entry.clothingIds.map((clothingId) => ({
        id: createId(),
        clothingId,
        date: entry.date,
        source: 'diary' as const,
        createdAt: now
      }))
    );

    for (const clothingId of entry.clothingIds) {
      const clothing = await clothingRepo.getById(clothingId);
      if (!clothing) continue;
      await clothingRepo.update(clothingId, {
        wearCount: clothing.wearCount + 1,
        lastWornAt: Math.max(clothing.lastWornAt ?? 0, entry.date),
        updatedAt: now
      });
    }
  },

  /**
   * 撤销某天的穿着统计（删除该天记录并回退 wearCount 与 lastWornAt）。
   * @param date 当天 0 点时间戳
   */
  async revertWearStats(date: number): Promise<void> {
    const records = await diaryRepo.listWearRecordsByDate(date);
    if (!records.length) return;

    const now = Date.now();
    for (const record of records) {
      const clothing = await clothingRepo.getById(record.clothingId);
      if (!clothing) continue;
      await clothingRepo.update(record.clothingId, {
        wearCount: Math.max(0, clothing.wearCount - 1),
        lastWornAt: clothing.lastWornAt === date ? undefined : clothing.lastWornAt,
        updatedAt: now
      });
    }
    await diaryRepo.removeWearRecordsByDate(date);
  },

  /**
   * 查询"很久没穿"的衣服。
   * TODO(第二阶段)：接入"很久没穿"列表页面。
   * @param limit 返回条数上限
   * @param minDays 至少多少天没穿（含从未穿过）
   * @returns 衣服列表，按最后穿着时间升序
   */
  async listLongUnworn(limit = 20, minDays = 30) {
    const clothes = await clothingRepo.list();
    const threshold = Date.now() - minDays * 24 * 60 * 60 * 1000;
    return clothes
      .filter((item) => !item.lastWornAt || item.lastWornAt < threshold)
      .sort((a, b) => (a.lastWornAt ?? 0) - (b.lastWornAt ?? 0))
      .slice(0, limit);
  }
};
