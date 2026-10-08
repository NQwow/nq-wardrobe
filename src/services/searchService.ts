/**
 * 搜索与筛选业务逻辑：按关键词、衣柜、标签、状态组合过滤衣服列表。
 */
import type { ClothingListItem } from './clothingService';
import type { ClothingStatus, Tag } from '@/models';

/** 筛选条件 */
export interface FilterQuery {
  /** 搜索关键词：匹配名字 / 编号 / 备注 / 标签名 */
  keyword: string;
  /** 选中的衣柜 id；空数组表示全部衣柜 */
  wardrobeIds: string[];
  /** 选中的标签 id（任一命中即可）；空数组表示不限制 */
  tagIds: string[];
  /** 选中的状态；空数组表示全部状态 */
  statuses: ClothingStatus[];
  /** 是否只看收藏 */
  favoriteOnly: boolean;
}

/** 空筛选条件 */
export const EMPTY_FILTER: FilterQuery = {
  keyword: '',
  wardrobeIds: [],
  tagIds: [],
  statuses: [],
  favoriteOnly: false
};

/**
 * 判断条目是否命中关键词。
 * @param item 列表条目
 * @param keyword 已归一化的关键词
 * @returns 是否命中
 */
function matchKeyword(item: ClothingListItem, keyword: string): boolean {
  if (!keyword) return true;
  const haystack = [
    item.clothing.name,
    item.clothing.code,
    item.clothing.note ?? '',
    ...item.tagNames
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(keyword);
}

/**
 * 把选中的标签展开成完整集合：选中一级标签时，自动带上它所有的下级标签。
 * 例如只勾了「上装」，则打了「短袖」「衬衫」等二级标签的衣服也会一起命中，
 * 不需要再手动勾一遍子标签。
 * @param selected 用户勾选的标签 id
 * @param tags 全部标签；不传时只按原样匹配
 * @returns 展开后的标签 id 集合
 */
export function expandTagIds(selected: string[], tags?: Tag[]): Set<string> {
  const result = new Set(selected);
  if (!tags?.length || !result.size) return result;

  // 反复扫描，层级加深时也无需改代码
  let grew = true;
  while (grew) {
    grew = false;
    for (const tag of tags) {
      if (tag.parentId && result.has(tag.parentId) && !result.has(tag.id)) {
        result.add(tag.id);
        grew = true;
      }
    }
  }
  return result;
}

export const searchService = {
  /**
   * 按筛选条件过滤列表。
   * @param items 衣服列表条目
   * @param query 筛选条件
   * @param tags 全部标签；传入后选中的一级标签会自动展开到二级子标签
   * @returns 过滤后的列表（新数组，不修改入参）
   */
  async filter(items: ClothingListItem[], query: FilterQuery, tags?: Tag[]): Promise<ClothingListItem[]> {
    const keyword = query.keyword.trim().toLowerCase();
    const wardrobeSet = new Set(query.wardrobeIds);
    const tagSet = expandTagIds(query.tagIds, tags);
    const statusSet = new Set(query.statuses);

    return items.filter((item) => {
      if (item.clothing.deletedAt) return false;
      if (!matchKeyword(item, keyword)) return false;
      if (wardrobeSet.size && !wardrobeSet.has(item.clothing.wardrobeId)) return false;
      if (statusSet.size && !statusSet.has(item.clothing.status)) return false;
      if (query.favoriteOnly && !item.clothing.favorite) return false;
      if (tagSet.size && !item.tagIds.some((tagId) => tagSet.has(tagId))) return false;
      return true;
    });
  },

  /**
   * 关键词搜索（只按关键词，供快速搜索复用）。
   * @param items 衣服列表条目
   * @param keyword 关键词
   * @returns 命中列表
   */
  async searchByKeyword(items: ClothingListItem[], keyword: string): Promise<ClothingListItem[]> {
    return this.filter(items, { ...EMPTY_FILTER, keyword });
  }
};
