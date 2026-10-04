/**
 * 标签业务逻辑：预设标签初始化结果查询、一级/二级树、标签增删改。
 */
import { clothingRepo, tagRepo } from '@/repositories';
import { createId } from '@/utils/id';
import { validateTagName } from '@/utils/validate';
import { TAG_TYPES, type Tag, type TagTreeNode, type TagType } from '@/models';

/** 新建标签的入参 */
export interface TagDraft {
  /** 标签名 */
  name: string;
  /** 标签类型 */
  type: TagType;
  /** 父标签 id（二级标签必传） */
  parentId?: string;
  /** 展示颜色 */
  color?: string;
}

export const tagService = {
  /**
   * 查询全部标签。
   * @returns 标签列表
   */
  async list(): Promise<Tag[]> {
    return tagRepo.list();
  },

  /**
   * 按类型查询标签。
   * @param type 标签类型
   * @returns 标签列表
   */
  async listByType(type: TagType): Promise<Tag[]> {
    return tagRepo.listByType(type);
  },

  /**
   * 按 id 查询标签。
   * @param id 标签 id
   * @returns 标签或 undefined
   */
  async getById(id: string): Promise<Tag | undefined> {
    return tagRepo.getById(id);
  },

  /**
   * 按 id 批量查询标签。
   * @param ids 标签 id 数组
   * @returns 标签列表
   */
  async listByIds(ids: string[]): Promise<Tag[]> {
    return tagRepo.listByIds(ids);
  },

  /**
   * 构建某个类型下的一级/二级标签树。
   * @param type 标签类型
   * @returns 标签树节点数组
   */
  async treeByType(type: TagType): Promise<TagTreeNode[]> {
    const all = await tagRepo.listByType(type);
    const roots = all.filter((item) => !item.parentId);
    return roots.map((tag) => ({
      tag,
      children: all.filter((item) => item.parentId === tag.id)
    }));
  },

  /**
   * 构建全部类型的标签树。
   * @returns 类型 → 标签树 的映射
   */
  async treeAll(): Promise<Record<TagType, TagTreeNode[]>> {
    const all = await tagRepo.list();
    const result = {} as Record<TagType, TagTreeNode[]>;
    for (const type of TAG_TYPES) {
      const typed = all.filter((item) => item.type === type);
      const roots = typed.filter((item) => !item.parentId);
      result[type] = roots.map((tag) => ({
        tag,
        children: typed.filter((item) => item.parentId === tag.id)
      }));
    }
    return result;
  },

  /**
   * 新增标签。
   * @param draft 标签草稿
   * @returns 创建后的标签
   * @throws 名称为空、重名或父标签无效时抛出错误
   */
  async create(draft: TagDraft): Promise<Tag> {
    const siblings = await tagRepo.listByType(draft.type);
    const sameLevel = siblings.filter((item) => item.parentId === draft.parentId);
    const error = validateTagName(
      draft.name,
      sameLevel.map((item) => item.name)
    );
    if (error) throw new Error(error);

    if (draft.parentId) {
      const parent = await tagRepo.getById(draft.parentId);
      if (!parent || parent.type !== draft.type) throw new Error('父标签无效');
      if (parent.parentId) throw new Error('只支持两级标签');
    }

    const now = Date.now();
    const maxOrder = siblings.reduce((max, item) => Math.max(max, item.sortOrder), -1);
    const tag: Tag = {
      id: createId(),
      name: draft.name.trim(),
      type: draft.type,
      parentId: draft.parentId,
      color: draft.color,
      sortOrder: maxOrder + 1,
      isPreset: false,
      createdAt: now
    };
    await tagRepo.put(tag);
    return tag;
  },

  /**
   * 更新标签名称 / 颜色。
   * @param id 标签 id
   * @param patch 待更新字段
   * @returns 更新后的标签
   * @throws 标签不存在或重名时抛出错误
   */
  async update(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    const target = await tagRepo.getById(id);
    if (!target) throw new Error('标签不存在');

    if (patch.name !== undefined) {
      const siblings = (await tagRepo.listByType(target.type)).filter(
        (item) => item.id !== id && item.parentId === target.parentId
      );
      const error = validateTagName(
        patch.name,
        siblings.map((item) => item.name)
      );
      if (error) throw new Error(error);
    }

    const next: Tag = {
      ...target,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : target.name
    };
    await tagRepo.put(next);
    return next;
  },

  /**
   * 删除标签：预设标签不可删；删除一级标签会连同二级标签一起删除。
   * @param id 标签 id
   * @returns 实际删除的标签 id 列表
   * @throws 标签不存在或为预设标签时抛出错误
   */
  async remove(id: string): Promise<string[]> {
    const target = await tagRepo.getById(id);
    if (!target) throw new Error('标签不存在');
    if (target.isPreset) throw new Error('预设标签不可删除');

    const children = await tagRepo.listChildren(id);
    const ids = [target.id, ...children.map((item) => item.id)];
    await tagRepo.removeMany(ids);
    // 级联清理衣服与这些标签的关联，避免产生悬空引用
    for (const tagId of ids) {
      await clothingRepo.removeRelationsByTag(tagId);
    }
    return ids;
  },

  /**
   * 统计各类型标签数量（标签管理页展示用）。
   * @returns 类型 → 数量 的映射
   */
  async countByTypeAll(): Promise<Record<TagType, number>> {
    const all = await tagRepo.list();
    const result = {} as Record<TagType, number>;
    for (const type of TAG_TYPES) {
      result[type] = all.filter((item) => item.type === type).length;
    }
    return result;
  }
};
