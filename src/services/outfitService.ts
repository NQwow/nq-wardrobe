/**
 * 搭配业务逻辑：搭配 CRUD、槽位管理、添加/移除衣服。
 *
 * 说明：第一阶段不实现搭配页面，这里先把数据层逻辑备好，
 * 页面与画布交互留到第二阶段（TODO 见各方法注释）。
 */
import { clothingRepo, outfitRepo } from '@/repositories';
import { createId } from '@/utils/id';
import type { Outfit, OutfitItem, OutfitSlot } from '@/models';

/** 搭配详情：搭配本体 + 搭配项 */
export interface OutfitDetail {
  /** 搭配本体 */
  outfit: Outfit;
  /** 搭配项列表 */
  items: OutfitItem[];
}

/** 搭配项 + 衣服名，便于列表直接展示 */
export interface OutfitItemDetail {
  /** 槽位 */
  slot: OutfitSlot;
  /** 衣服 id */
  clothingId: string;
  /** 衣服名（衣服已被删除时为空串） */
  name: string;
  /** 衣服编号 */
  code: string;
}

/** 搭配摘要：搭配本体 + 成员明细，用于已保存搭配列表 */
export interface OutfitSummary {
  /** 搭配本体 */
  outfit: Outfit;
  /** 成员明细，按槽位顺序排列 */
  items: OutfitItemDetail[];
}

export const outfitService = {
  /**
   * 查询全部未删除搭配。
   * @returns 搭配列表
   */
  async list(): Promise<Outfit[]> {
    return outfitRepo.list();
  },

  /**
   * 查询全部搭配并带上成员明细（衣服名、编号），供列表直接展示。
   * @returns 搭配摘要列表
   */
  async listSummaries(): Promise<OutfitSummary[]> {
    const outfits = await outfitRepo.list();
    if (!outfits.length) return [];

    const allItems = await outfitRepo.listItemsByOutfits(outfits.map((item) => item.id));
    const clothes = await clothingRepo.listByIds(Array.from(new Set(allItems.map((item) => item.clothingId))));
    const clothingMap = new Map(clothes.map((item) => [item.id, item]));

    return outfits.map((outfit) => ({
      outfit,
      items: allItems
        .filter((item) => item.outfitId === outfit.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          slot: item.slot,
          clothingId: item.clothingId,
          name: clothingMap.get(item.clothingId)?.name ?? '',
          code: clothingMap.get(item.clothingId)?.code ?? ''
        }))
    }));
  },

  /**
   * 反查某件衣服出现在哪些搭配里。
   * @param clothingId 衣服 id
   * @returns 搭配列表（按更新时间倒序）
   */
  async listByClothing(clothingId: string): Promise<Outfit[]> {
    const items = await outfitRepo.listItemsByClothing(clothingId);
    const ids = Array.from(new Set(items.map((item) => item.outfitId)));
    if (!ids.length) return [];

    const outfits = await Promise.all(ids.map((id) => outfitRepo.getById(id)));
    return outfits
      .filter((item): item is Outfit => Boolean(item) && !item?.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * 查询搭配详情。
   * @param id 搭配 id
   * @returns 详情；搭配不存在时返回 undefined
   */
  async getDetail(id: string): Promise<OutfitDetail | undefined> {
    const outfit = await outfitRepo.getById(id);
    if (!outfit) return undefined;
    const items = await outfitRepo.listItems(id);
    return { outfit, items };
  },

  /**
   * 新建搭配。
   * @param name 搭配名（必填）
   * @param note 备注
   * @returns 创建后的搭配
   * @throws 名称为空时抛出错误
   */
  async create(name: string, note = ''): Promise<Outfit> {
    if (!name.trim()) throw new Error('请填写搭配名');
    const now = Date.now();
    const outfit: Outfit = {
      id: createId(),
      name: name.trim(),
      note: note.trim() || undefined,
      favorite: false,
      createdAt: now,
      updatedAt: now
    };
    await outfitRepo.put(outfit);
    return outfit;
  },

  /**
   * 保存搭配（新建或覆盖搭配项）。
   * TODO(第二阶段)：由 OutfitView 的画布调用。
   * @param payload 搭配名、备注与每个槽位选中的衣服
   * @returns 保存后的搭配
   * @throws 没有名字或没有任何衣服时抛出错误
   */
  async save(
    payload: { id?: string; name: string; note?: string; items: { clothingId: string; slot: OutfitSlot }[] }
  ): Promise<Outfit> {
    if (!payload.name.trim()) throw new Error('请先给搭配起个名字');
    if (!payload.items.length) throw new Error('请至少放入一件衣服');

    const now = Date.now();
    let outfit: Outfit;
    if (payload.id) {
      const current = await outfitRepo.getById(payload.id);
      if (!current) throw new Error('搭配不存在');
      outfit = { ...current, name: payload.name.trim(), note: payload.note?.trim() || undefined, updatedAt: now };
      await outfitRepo.put(outfit);
      await outfitRepo.removeItemsByOutfit(outfit.id);
    } else {
      outfit = {
        id: createId(),
        name: payload.name.trim(),
        note: payload.note?.trim() || undefined,
        favorite: false,
        createdAt: now,
        updatedAt: now
      };
      await outfitRepo.put(outfit);
    }

    const items: OutfitItem[] = payload.items.map((item, index) => ({
      id: createId(),
      outfitId: outfit.id,
      clothingId: item.clothingId,
      slot: item.slot,
      sortOrder: index
    }));
    await outfitRepo.bulkPutItems(items);
    return outfit;
  },

  /**
   * 切换搭配收藏状态。
   * @param id 搭配 id
   * @returns 切换后的收藏状态
   * @throws 搭配不存在时抛出错误
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const current = await outfitRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('搭配不存在或已被删除');
    const favorite = !current.favorite;
    await outfitRepo.update(id, { favorite, updatedAt: Date.now() });
    return favorite;
  },

  /**
   * 软删除搭配，并清理其搭配项。
   * @param id 搭配 id
   * @throws 搭配不存在时抛出错误
   */
  async remove(id: string): Promise<void> {
    const current = await outfitRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('搭配不存在或已被删除');
    await outfitRepo.update(id, { deletedAt: Date.now() });
    await outfitRepo.removeItemsByOutfit(id);
  }
};
