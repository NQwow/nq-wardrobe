/**
 * 搜索与筛选业务逻辑：按关键词、衣柜、标签、状态组合过滤衣服列表。
 */
import type { ClothingListItem } from './clothingService';
import type { ClothingStatus } from '@/models';

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

export const searchService = {
  /**
   * 按筛选条件过滤列表。
   * @param items 衣服列表条目
   * @param query 筛选条件
   * @returns 过滤后的列表（新数组，不修改入参）
   */
  async filter(items: ClothingListItem[], query: FilterQuery): Promise<ClothingListItem[]> {
    const keyword = query.keyword.trim().toLowerCase();
    const wardrobeSet = new Set(query.wardrobeIds);
    const tagSet = new Set(query.tagIds);
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
