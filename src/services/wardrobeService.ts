/**
 * 衣柜业务逻辑：增删改查、默认衣柜、删除时把衣服迁移到默认衣柜。
 */
import { clothingRepo, wardrobeRepo } from '@/repositories';
import { createId } from '@/utils/id';
import { validateWardrobeName } from '@/utils/validate';
import {
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  type Wardrobe,
  type WardrobeDraft
} from '@/models';

/** 删除衣柜的结果说明 */
export interface DeleteWardrobeResult {
  /** 被迁移的衣服数量 */
  migratedCount: number;
  /** 迁移到的目标衣柜 id */
  targetWardrobeId: string;
}

export const wardrobeService = {
  /**
   * 查询全部未删除衣柜。
   * @returns 衣柜列表（按 sortOrder 升序）
   */
  async list(): Promise<Wardrobe[]> {
    return wardrobeRepo.list();
  },

  /**
   * 按 id 查询衣柜。
   * @param id 衣柜 id
   * @returns 衣柜或 undefined
   */
  async getById(id: string): Promise<Wardrobe | undefined> {
    return wardrobeRepo.getById(id);
  },

  /**
   * 新增衣柜。
   * @param draft 衣柜草稿（name 必填）
   * @returns 创建后的衣柜
   * @throws 名称为空或重名时抛出错误
   */
  async create(draft: WardrobeDraft): Promise<Wardrobe> {
    const existing = await wardrobeRepo.list();
    const error = validateWardrobeName(
      draft.name,
      existing.map((item) => item.name)
    );
    if (error) throw new Error(error);

    const now = Date.now();
    const maxOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1);
    const wardrobe: Wardrobe = {
      id: createId(),
      name: draft.name.trim(),
      icon: draft.icon ?? DEFAULT_WARDROBE_SHAPE,
      color: draft.color ?? DEFAULT_WARDROBE_TONE,
      sortOrder: draft.sortOrder ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };
    await wardrobeRepo.put(wardrobe);
    return wardrobe;
  },

  /**
   * 更新衣柜（改名 / 图标 / 颜色 / 排序）。
   * @param id 衣柜 id
   * @param patch 待更新字段
   * @returns 更新后的衣柜
   * @throws 衣柜不存在或改名后重名时抛出错误
   */
  async update(id: string, patch: Partial<WardrobeDraft>): Promise<Wardrobe> {
    const target = await wardrobeRepo.getById(id);
    if (!target || target.deletedAt) throw new Error('衣柜不存在或已被删除');

    if (patch.name !== undefined) {
      const others = (await wardrobeRepo.list()).filter((item) => item.id !== id);
      const error = validateWardrobeName(
        patch.name,
        others.map((item) => item.name)
      );
      if (error) throw new Error(error);
    }

    const next: Wardrobe = {
      ...target,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : target.name,
      updatedAt: Date.now()
    };
    await wardrobeRepo.put(next);
    return next;
  },

  /**
   * 删除衣柜；非空时把其中衣服迁移到目标衣柜。
   * @param id 待删除衣柜 id
   * @param targetWardrobeId 迁移目标衣柜 id，缺省时自动选择默认衣柜
   * @returns 迁移结果（未迁移任何衣服时 migratedCount 为 0）
   * @throws 衣柜不存在、或只剩一个衣柜时抛出错误
   */
  async remove(id: string, targetWardrobeId?: string): Promise<DeleteWardrobeResult> {
    const all = await wardrobeRepo.list();
    const target = all.find((item) => item.id === id);
    if (!target) throw new Error('衣柜不存在或已被删除');
    if (all.length <= 1) throw new Error('至少要保留一个衣柜');

    const count = await clothingRepo.countByWardrobe(id);
    let resolvedTargetId = targetWardrobeId ?? '';
    if (!resolvedTargetId) {
      const fallback = all.find((item) => item.id !== id);
      if (!fallback) throw new Error('找不到可迁移的目标衣柜');
      resolvedTargetId = fallback.id;
    } else if (resolvedTargetId === id || !all.some((item) => item.id === resolvedTargetId)) {
      throw new Error('迁移的目标衣柜无效');
    }

    if (count > 0) {
      await clothingRepo.migrateWardrobe(id, resolvedTargetId);
    }
    await wardrobeRepo.remove(id);

    return { migratedCount: count, targetWardrobeId: resolvedTargetId };
  },

  /**
   * 统计衣柜中未删除的衣服数量。
   * @param id 衣柜 id
   * @returns 衣服数量
   */
  async countClothes(id: string): Promise<number> {
    return clothingRepo.countByWardrobe(id);
  },

  /**
   * 批量统计各衣柜衣服数量。
   * @returns 衣柜 id → 数量 的映射
   */
  async countAllClothes(): Promise<Record<string, number>> {
    const clothes = await clothingRepo.list();
    const result: Record<string, number> = {};
    for (const item of clothes) {
      result[item.wardrobeId] = (result[item.wardrobeId] ?? 0) + 1;
    }
    return result;
  },

  /**
   * 调整衣柜排序：把指定衣柜上移或下移一位。
   * @param id 衣柜 id
   * @param direction 方向，-1 上移，1 下移
   * @returns 是否发生了调整
   */
  async move(id: string, direction: -1 | 1): Promise<boolean> {
    const list = await wardrobeRepo.list();
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= list.length) return false;

    const now = Date.now();
    const current = list[index];
    const other = list[swapIndex];
    await wardrobeRepo.bulkPut([
      { ...current, sortOrder: other.sortOrder, updatedAt: now },
      { ...other, sortOrder: current.sortOrder, updatedAt: now }
    ]);
    return true;
  },

  /**
   * 确保存在至少一个衣柜，返回第一个可用衣柜（应用启动时调用）。
   * @param fallback 由 seed 提供的默认衣柜
   * @returns 第一个可用衣柜
   */
  async ensureFirst(fallback: Wardrobe): Promise<Wardrobe> {
    const list = await wardrobeRepo.list();
    if (list.length) return list[0];
    await wardrobeRepo.put(fallback);
    return fallback;
  }
};
