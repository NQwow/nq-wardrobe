/**
 * 设置表（settings）数据访问：key-value 读写。
 */
import { db } from '@/db';
import type { Setting } from '@/models';

export const settingRepo = {
  /**
   * 读取单个设置项。
   * @param key 设置键名
   * @returns 设置项或 undefined
   */
  async get(key: string): Promise<Setting | undefined> {
    return db.settings.get(key);
  },

  /**
   * 读取全部设置项。
   * @returns 设置列表
   */
  async list(): Promise<Setting[]> {
    return db.settings.toArray();
  },

  /**
   * 写入单个设置项（不存在则创建）。
   * @param key 设置键名
   * @param value 设置值
   */
  async put(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },

  /**
   * 批量写入设置项。
   * @param list 设置列表
   */
  async bulkPut(list: Setting[]): Promise<void> {
    if (!list.length) return;
    await db.settings.bulkPut(list);
  },

  /**
   * 删除单个设置项。
   * @param key 设置键名
   */
  async remove(key: string): Promise<void> {
    await db.settings.delete(key);
  },

  /** 清空整张表（备份覆盖导入使用） */
  async clear(): Promise<void> {
    await db.settings.clear();
  }
};
