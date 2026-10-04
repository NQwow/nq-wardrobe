/**
 * 衣柜表（wardrobes）数据访问：只做 CRUD，不含业务规则。
 */
import { db } from '@/db';
import type { Wardrobe } from '@/models';

export const wardrobeRepo = {
  /**
   * 查询全部未删除衣柜，按 sortOrder 升序。
   * @returns 衣柜列表
   */
  async list(): Promise<Wardrobe[]> {
    const rows = await db.wardrobes.orderBy('sortOrder').toArray();
    return rows.filter((item) => !item.deletedAt);
  },

  /**
   * 查询全部衣柜（含已软删除），备份导出使用。
   * @returns 衣柜列表
   */
  async listAll(): Promise<Wardrobe[]> {
    return db.wardrobes.toArray();
  },

  /**
   * 按 id 查询衣柜。
   * @param id 衣柜 id
   * @returns 衣柜或 undefined
   */
  async getById(id: string): Promise<Wardrobe | undefined> {
    return db.wardrobes.get(id);
  },

  /**
   * 新增或覆盖衣柜。
   * @param wardrobe 衣柜记录
   */
  async put(wardrobe: Wardrobe): Promise<void> {
    await db.wardrobes.put(wardrobe);
  },

  /**
   * 批量新增或覆盖衣柜。
   * @param list 衣柜列表
   */
  async bulkPut(list: Wardrobe[]): Promise<void> {
    if (!list.length) return;
    await db.wardrobes.bulkPut(list);
  },

  /**
   * 局部更新衣柜字段。
   * @param id 衣柜 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<Wardrobe>): Promise<void> {
    await db.wardrobes.update(id, patch);
  },

  /**
   * 物理删除衣柜。
   * @param id 衣柜 id
   */
  async remove(id: string): Promise<void> {
    await db.wardrobes.delete(id);
  },

  /**
   * 统计衣柜数量（未删除）。
   * @returns 数量
   */
  async count(): Promise<number> {
    const rows = await db.wardrobes.toArray();
    return rows.filter((item) => !item.deletedAt).length;
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.wardrobes.clear();
  }
};
