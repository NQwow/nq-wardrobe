/**
 * 日记表（diaries）与穿着记录表（wearRecords）数据访问：只做 CRUD。
 * 第一阶段无页面调用，但接口先备好。
 */
import { db } from '@/db';
import type { DiaryEntry, WearRecord } from '@/models';

export const diaryRepo = {
  /**
   * 查询全部日记，按日期倒序。
   * @returns 日记列表
   */
  async list(): Promise<DiaryEntry[]> {
    const rows = await db.diaries.orderBy('date').reverse().toArray();
    return rows;
  },

  /**
   * 按 id 查询日记。
   * @param id 日记 id
   * @returns 日记或 undefined
   */
  async getById(id: string): Promise<DiaryEntry | undefined> {
    return db.diaries.get(id);
  },

  /**
   * 按日期查询日记（同一天只应有一条）。
   * @param date 当天 0 点时间戳
   * @returns 日记或 undefined
   */
  async getByDate(date: number): Promise<DiaryEntry | undefined> {
    return db.diaries.where('date').equals(date).first();
  },

  /**
   * 新增或覆盖日记。
   * @param entry 日记记录
   */
  async put(entry: DiaryEntry): Promise<void> {
    await db.diaries.put(entry);
  },

  /**
   * 批量新增或覆盖日记。
   * @param list 日记列表
   */
  async bulkPut(list: DiaryEntry[]): Promise<void> {
    if (!list.length) return;
    await db.diaries.bulkPut(list);
  },

  /**
   * 局部更新日记字段。
   * @param id 日记 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<DiaryEntry>): Promise<void> {
    await db.diaries.update(id, patch);
  },

  /**
   * 物理删除日记。
   * @param id 日记 id
   */
  async remove(id: string): Promise<void> {
    await db.diaries.delete(id);
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.diaries.clear();
  },

  /* ------------------------------ 穿着记录 ------------------------------ */

  /**
   * 查询全部穿着记录（备份导出使用）。
   * @returns 穿着记录列表
   */
  async listWearRecords(): Promise<WearRecord[]> {
    return db.wearRecords.toArray();
  },

  /**
   * 查询某件衣服的穿着记录，按日期倒序。
   * @param clothingId 衣服 id
   * @returns 穿着记录列表
   */
  async listWearRecordsByClothing(clothingId: string): Promise<WearRecord[]> {
    const rows = await db.wearRecords.where('clothingId').equals(clothingId).toArray();
    return rows.sort((a, b) => b.date - a.date);
  },

  /**
   * 查询某天的穿着记录。
   * @param date 当天 0 点时间戳
   * @returns 穿着记录列表
   */
  async listWearRecordsByDate(date: number): Promise<WearRecord[]> {
    return db.wearRecords.where('date').equals(date).toArray();
  },

  /**
   * 批量写入穿着记录。
   * @param list 穿着记录列表
   */
  async bulkPutWearRecords(list: WearRecord[]): Promise<void> {
    if (!list.length) return;
    await db.wearRecords.bulkPut(list);
  },

  /**
   * 删除某天的全部穿着记录（日记被删除或修改时调用）。
   * @param date 当天 0 点时间戳
   */
  async removeWearRecordsByDate(date: number): Promise<void> {
    await db.wearRecords.where('date').equals(date).delete();
  },

  /**
   * 删除某件衣服的全部穿着记录（衣服被删除时调用）。
   * @param clothingId 衣服 id
   */
  async removeWearRecordsByClothing(clothingId: string): Promise<void> {
    await db.wearRecords.where('clothingId').equals(clothingId).delete();
  },

  /** 清空穿着记录表（备份覆盖导入使用） */
  async clearWearRecords(): Promise<void> {
    await db.wearRecords.clear();
  }
};
