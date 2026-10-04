/**
 * 标签表（tags）数据访问：只做 CRUD。
 */
import { db } from '@/db';
import type { Tag, TagType } from '@/models';

export const tagRepo = {
  /**
   * 查询全部标签，按类型内 sortOrder 升序。
   * @returns 标签列表
   */
  async list(): Promise<Tag[]> {
    const rows = await db.tags.orderBy('sortOrder').toArray();
    return rows;
  },

  /**
   * 按类型查询标签，按 sortOrder 升序。
   * @param type 标签类型
   * @returns 标签列表
   */
  async listByType(type: TagType): Promise<Tag[]> {
    const rows = await db.tags.where('type').equals(type).toArray();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * 按 id 查询标签。
   * @param id 标签 id
   * @returns 标签或 undefined
   */
  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  /**
   * 按 id 批量查询标签。
   * @param ids 标签 id 数组
   * @returns 标签列表
   */
  async listByIds(ids: string[]): Promise<Tag[]> {
    if (!ids.length) return [];
    return db.tags.where('id').anyOf(ids).toArray();
  },

  /**
   * 查询某个一级标签下的子标签。
   * @param parentId 父标签 id
   * @returns 子标签列表
   */
  async listChildren(parentId: string): Promise<Tag[]> {
    const rows = await db.tags.where('parentId').equals(parentId).toArray();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /**
   * 新增或覆盖标签。
   * @param tag 标签记录
   */
  async put(tag: Tag): Promise<void> {
    await db.tags.put(tag);
  },

  /**
   * 批量新增或覆盖标签。
   * @param list 标签列表
   */
  async bulkPut(list: Tag[]): Promise<void> {
    if (!list.length) return;
    await db.tags.bulkPut(list);
  },

  /**
   * 局部更新标签字段。
   * @param id 标签 id
   * @param patch 待更新字段
   */
  async update(id: string, patch: Partial<Tag>): Promise<void> {
    await db.tags.update(id, patch);
  },

  /**
   * 物理删除标签。
   * @param id 标签 id
   */
  async remove(id: string): Promise<void> {
    await db.tags.delete(id);
  },

  /**
   * 批量物理删除标签。
   * @param ids 标签 id 数组
   */
  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await db.tags.bulkDelete(ids);
  },

  /**
   * 统计某类型下标签数量。
   * @param type 标签类型
   * @returns 数量
   */
  async countByType(type: TagType): Promise<number> {
    return db.tags.where('type').equals(type).count();
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.tags.clear();
  }
};
