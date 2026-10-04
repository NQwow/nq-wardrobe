/**
 * 衣服表（clothes）与衣服标签关联表（clothingTags）数据访问：只做 CRUD。
 */
import { db } from '@/db';
import type { Clothing, ClothingTag } from '@/models';

export const clothingRepo = {
  /**
   * 查询全部未删除衣服。
   * @returns 衣服列表
   */
  async list(): Promise<Clothing[]> {
    const rows = await db.clothes.toArray();
    return rows.filter((item) => !item.deletedAt);
  },

  /**
   * 查询全部衣服（含软删除），备份导出使用。
   * @returns 衣服列表
   */
  async listAll(): Promise<Clothing[]> {
    return db.clothes.toArray();
  },

  /**
   * 按 id 查询衣服（不过滤软删除，详情页需要能读到）。
   * @param id 衣服 id
   * @returns 衣服或 undefined
   */
  async getById(id: string): Promise<Clothing | undefined> {
    return db.clothes.get(id);
  },

  /**
   * 按 id 批量查询衣服。
   * @param ids 衣服 id 数组
   * @returns 衣服列表（顺序不保证）
   */
  async listByIds(ids: string[]): Promise<Clothing[]> {
    if (!ids.length) return [];
    return db.clothes.where('id').anyOf(ids).toArray();
  },

  /**
   * 按衣柜查询未删除衣服。
   * @param wardrobeId 衣柜 id
   * @returns 衣服列表
   */
  async listByWardrobe(wardrobeId: string): Promise<Clothing[]> {
    const rows = await db.clothes.where('wardrobeId').equals(wardrobeId).toArray();
    return rows.filter((item) => !item.deletedAt);
  },

  /**
   * 按编号精确查询（用于唯一性校验）。
   * @param code 编号
   * @returns 衣服或 undefined
   */
  async getByCode(code: string): Promise<Clothing | undefined> {
    return db.clothes.where('code').equals(code).first();
  },

  /**
   * 查询全部编号（未删除），用于生成下一个编号。
   * @returns 编号数组
   */
  async listCodes(): Promise<string[]> {
    const rows = await db.clothes.toArray();
    return rows.filter((item) => !item.deletedAt).map((item) => item.code);
  },

  /**
   * 新增或覆盖衣服。
   * @param clothing 衣服记录
   */
  async put(clothing: Clothing): Promise<void> {
    await db.clothes.put(clothing);
  },

  /**
   * 批量新增或覆盖衣服。
   * @param list 衣服列表
   */
  async bulkPut(list: Clothing[]): Promise<void> {
    if (!list.length) return;
    await db.clothes.bulkPut(list);
  },

  /**
   * 局部更新衣服字段。
   * @param id 衣服 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<Clothing>): Promise<void> {
    await db.clothes.update(id, patch);
  },

  /**
   * 物理删除衣服。
   * @param id 衣服 id
   */
  async remove(id: string): Promise<void> {
    await db.clothes.delete(id);
  },

  /**
   * 统计某衣柜下未删除的衣服数量。
   * @param wardrobeId 衣柜 id
   * @returns 数量
   */
  async countByWardrobe(wardrobeId: string): Promise<number> {
    const rows = await db.clothes.where('wardrobeId').equals(wardrobeId).toArray();
    return rows.filter((item) => !item.deletedAt).length;
  },

  /**
   * 把某衣柜下的衣服迁移到另一个衣柜。
   * @param fromWardrobeId 原衣柜 id
   * @param toWardrobeId 目标衣柜 id
   */
  async migrateWardrobe(fromWardrobeId: string, toWardrobeId: string): Promise<void> {
    await db.clothes.where('wardrobeId').equals(fromWardrobeId).modify({ wardrobeId: toWardrobeId });
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.clothes.clear();
  },

  /* ----------------------------- 衣服标签关联 ----------------------------- */

  /**
   * 查询全部衣服标签关联（备份导出使用）。
   * @returns 关联列表
   */
  async listRelations(): Promise<ClothingTag[]> {
    return db.clothingTags.toArray();
  },

  /**
   * 查询某件衣服的标签关联。
   * @param clothingId 衣服 id
   * @returns 关联列表
   */
  async listRelationsByClothing(clothingId: string): Promise<ClothingTag[]> {
    return db.clothingTags.where('clothingId').equals(clothingId).toArray();
  },

  /**
   * 按衣服 id 批量查询标签关联。
   * @param clothingIds 衣服 id 数组
   * @returns 关联列表
   */
  async listRelationsByClothes(clothingIds: string[]): Promise<ClothingTag[]> {
    if (!clothingIds.length) return [];
    return db.clothingTags.where('clothingId').anyOf(clothingIds).toArray();
  },

  /**
   * 写入衣服标签关联（覆盖同衣服的旧关联由 service 负责）。
   * @param relations 关联列表
   */
  async bulkPutRelations(relations: ClothingTag[]): Promise<void> {
    if (!relations.length) return;
    await db.clothingTags.bulkPut(relations);
  },

  /**
   * 删除某件衣服的全部标签关联。
   * @param clothingId 衣服 id
   */
  async removeRelationsByClothing(clothingId: string): Promise<void> {
    await db.clothingTags.where('clothingId').equals(clothingId).delete();
  },

  /**
   * 按衣服 id 批量删除标签关联。
   * @param clothingIds 衣服 id 数组
   */
  async removeRelationsByClothes(clothingIds: string[]): Promise<void> {
    if (!clothingIds.length) return;
    await db.clothingTags.where('clothingId').anyOf(clothingIds).delete();
  },

  /**
   * 删除引用了某个标签的全部关联（标签被删除时调用）。
   * @param tagId 标签 id
   */
  async removeRelationsByTag(tagId: string): Promise<void> {
    await db.clothingTags.where('tagId').equals(tagId).delete();
  },

  /** 清空衣服标签关联表（备份覆盖导入使用） */
  async clearRelations(): Promise<void> {
    await db.clothingTags.clear();
  }
};
