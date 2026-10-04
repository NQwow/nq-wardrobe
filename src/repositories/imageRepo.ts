/**
 * 衣服图片表（images）数据访问：只做 CRUD。
 */
import { db } from '@/db';
import type { ClothingImage } from '@/models';

export const imageRepo = {
  /**
   * 查询某件衣服的全部图片，按 sortOrder 升序。
   * @param clothingId 衣服 id
   * @returns 图片列表
   */
  async listByClothing(clothingId: string): Promise<ClothingImage[]> {
    const rows = await db.images.where('clothingId').equals(clothingId).toArray();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * 批量查询多件衣服的图片，按 clothes 顺序返回。
   * @param clothingIds 衣服 id 数组
   * @returns 图片列表
   */
  async listByClothes(clothingIds: string[]): Promise<ClothingImage[]> {
    if (!clothingIds.length) return [];
    return db.images.where('clothingId').anyOf(clothingIds).toArray();
  },

  /**
   * 按 id 查询图片。
   * @param id 图片 id
   * @returns 图片或 undefined
   */
  async getById(id: string): Promise<ClothingImage | undefined> {
    return db.images.get(id);
  },

  /**
   * 查询全部图片（备份导出使用）。
   * @returns 图片列表
   */
  async listAll(): Promise<ClothingImage[]> {
    return db.images.toArray();
  },

  /**
   * 新增或覆盖图片。
   * @param image 图片记录
   */
  async put(image: ClothingImage): Promise<void> {
    await db.images.put(image);
  },

  /**
   * 批量新增或覆盖图片。
   * @param list 图片列表
   */
  async bulkPut(list: ClothingImage[]): Promise<void> {
    if (!list.length) return;
    await db.images.bulkPut(list);
  },

  /**
   * 局部更新图片字段。
   * @param id 图片 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<ClothingImage>): Promise<void> {
    await db.images.update(id, patch);
  },

  /**
   * 物理删除单张图片。
   * @param id 图片 id
   */
  async remove(id: string): Promise<void> {
    await db.images.delete(id);
  },

  /**
   * 批量物理删除图片。
   * @param ids 图片 id 数组
   */
  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await db.images.bulkDelete(ids);
  },

  /**
   * 删除某件衣服的全部图片（衣服被删除时级联调用）。
   * @param clothingId 衣服 id
   */
  async removeByClothing(clothingId: string): Promise<void> {
    await db.images.where('clothingId').equals(clothingId).delete();
  },

  /**
   * 按衣服 id 批量删除图片。
   * @param clothingIds 衣服 id 数组
   */
  async removeByClothes(clothingIds: string[]): Promise<void> {
    if (!clothingIds.length) return;
    await db.images.where('clothingId').anyOf(clothingIds).delete();
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.images.clear();
  }
};
