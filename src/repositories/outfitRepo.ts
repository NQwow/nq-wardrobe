/**
 * 搭配表（outfits）与搭配项表（outfitItems）数据访问：只做 CRUD。
 * 第一阶段无页面调用，但接口先备好。
 */
import { db } from '@/db';
import type { Outfit, OutfitItem } from '@/models';

export const outfitRepo = {
  /**
   * 查询全部未删除搭配，按创建时间倒序。
   * @returns 搭配列表
   */
  async list(): Promise<Outfit[]> {
    const rows = await db.outfits.orderBy('createdAt').reverse().toArray();
    return rows.filter((item) => !item.deletedAt);
  },

  /**
   * 查询全部搭配（含软删除），备份导出使用。
   * @returns 搭配列表
   */
  async listAll(): Promise<Outfit[]> {
    return db.outfits.toArray();
  },

  /**
   * 按 id 查询搭配。
   * @param id 搭配 id
   * @returns 搭配或 undefined
   */
  async getById(id: string): Promise<Outfit | undefined> {
    return db.outfits.get(id);
  },

  /**
   * 新增或覆盖搭配。
   * @param outfit 搭配记录
   */
  async put(outfit: Outfit): Promise<void> {
    await db.outfits.put(outfit);
  },

  /**
   * 批量新增或覆盖搭配。
   * @param list 搭配列表
   */
  async bulkPut(list: Outfit[]): Promise<void> {
    if (!list.length) return;
    await db.outfits.bulkPut(list);
  },

  /**
   * 局部更新搭配字段。
   * @param id 搭配 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<Outfit>): Promise<void> {
    await db.outfits.update(id, patch);
  },

  /**
   * 物理删除搭配。
   * @param id 搭配 id
   */
  async remove(id: string): Promise<void> {
    await db.outfits.delete(id);
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.outfits.clear();
  },

  /* ------------------------------- 搭配项 ------------------------------- */

  /**
   * 查询某搭配的全部搭配项，按槽位与序号排序。
   * @param outfitId 搭配 id
   * @returns 搭配项列表
   */
  async listItems(outfitId: string): Promise<OutfitItem[]> {
    const rows = await db.outfitItems.where('outfitId').equals(outfitId).toArray();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * 查询全部搭配项（备份导出使用）。
   * @returns 搭配项列表
   */
  async listAllItems(): Promise<OutfitItem[]> {
    return db.outfitItems.toArray();
  },

  /**
   * 新增或覆盖搭配项。
   * @param item 搭配项
   */
  async putItem(item: OutfitItem): Promise<void> {
    await db.outfitItems.put(item);
  },

  /**
   * 批量新增或覆盖搭配项。
   * @param list 搭配项列表
   */
  async bulkPutItems(list: OutfitItem[]): Promise<void> {
    if (!list.length) return;
    await db.outfitItems.bulkPut(list);
  },

  /**
   * 物理删除单个搭配项。
   * @param id 搭配项 id
   */
  async removeItem(id: string): Promise<void> {
    await db.outfitItems.delete(id);
  },

  /**
   * 删除某搭配的全部搭配项。
   * @param outfitId 搭配 id
   */
  async removeItemsByOutfit(outfitId: string): Promise<void> {
    await db.outfitItems.where('outfitId').equals(outfitId).delete();
  },

  /**
   * 删除引用了某件衣服的全部搭配项（衣服被删除时调用）。
   * @param clothingId 衣服 id
   */
  async removeItemsByClothing(clothingId: string): Promise<void> {
    await db.outfitItems.where('clothingId').equals(clothingId).delete();
  },

  /** 清空搭配项表（备份覆盖导入使用） */
  async clearItems(): Promise<void> {
    await db.outfitItems.clear();
  }
};
