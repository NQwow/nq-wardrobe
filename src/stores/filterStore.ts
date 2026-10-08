/**
 * 筛选 store：搜索关键词、衣柜多选、标签筛选、状态筛选与排序。
 * 内部监听衣服列表与筛选条件变化，自动重算 visibleItems。
 */
import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import { EMPTY_FILTER, searchService, sortService, type ClothingListItem, type FilterQuery } from '@/services';
import { useClothingStore } from './clothingStore';
import { useTagStore } from './tagStore';
import type { ClothingStatus, SortKey } from '@/models';

export const useFilterStore = defineStore('filter', () => {
  const clothingStore = useClothingStore();
  // 标签树用于把选中的一级标签展开到二级，见 searchService.expandTagIds
  const tagStore = useTagStore();

  /** 当前筛选条件 */
  const query = reactive<FilterQuery>({ ...EMPTY_FILTER, wardrobeIds: [], tagIds: [], statuses: [] });
  /** 排序方式 */
  const sortKey = ref<SortKey>('recent');
  /** 过滤 + 排序后的可见列表 */
  const visibleItems = ref<ClothingListItem[]>([]);
  /** 是否正在计算 */
  const computing = ref(false);

  /** 用于丢弃过期计算结果的令牌 */
  let token = 0;

  /** 是否存在任何筛选条件（用于显示"清空筛选"） */
  const hasFilter = ref(false);

  /**
   * 依据当前条件重算可见列表。
   */
  async function refresh(): Promise<void> {
    const current = ++token;
    computing.value = true;
    try {
      const filtered = await searchService.filter(clothingStore.items, query, tagStore.list);
      const sorted = await sortService.sort(filtered, sortKey.value);
      if (current !== token) return;
      visibleItems.value = sorted;
      hasFilter.value =
        Boolean(query.keyword.trim()) ||
        query.wardrobeIds.length > 0 ||
        query.tagIds.length > 0 ||
        query.statuses.length > 0 ||
        query.favoriteOnly;
    } finally {
      if (current === token) computing.value = false;
    }
  }

  // 数据或条件变化时自动重算
  watch(() => clothingStore.items, () => void refresh());
  watch(query, () => void refresh(), { deep: true });
  watch(sortKey, () => void refresh());
  // 标签是异步加载的，加载完成后一级标签才能索引到二级，需要重算一次
  watch(() => tagStore.list, () => void refresh());

  /**
   * 设置搜索关键词。
   * @param keyword 关键词
   */
  function setKeyword(keyword: string): void {
    query.keyword = keyword;
  }

  /**
   * 切换某个衣柜的选中状态。
   * @param wardrobeId 衣柜 id
   */
  function toggleWardrobe(wardrobeId: string): void {
    const index = query.wardrobeIds.indexOf(wardrobeId);
    if (index >= 0) query.wardrobeIds.splice(index, 1);
    else query.wardrobeIds.push(wardrobeId);
  }

  /**
   * 清空衣柜筛选（表示"全部衣柜"）。
   */
  function clearWardrobes(): void {
    query.wardrobeIds.splice(0, query.wardrobeIds.length);
  }

  /**
   * 设置衣柜筛选为指定单个衣柜。
   * @param wardrobeId 衣柜 id
   */
  function setOnlyWardrobe(wardrobeId: string): void {
    query.wardrobeIds.splice(0, query.wardrobeIds.length, wardrobeId);
  }

  /**
   * 切换某个标签的选中状态。
   * @param tagId 标签 id
   */
  function toggleTag(tagId: string): void {
    const index = query.tagIds.indexOf(tagId);
    if (index >= 0) query.tagIds.splice(index, 1);
    else query.tagIds.push(tagId);
  }

  /**
   * 清空标签筛选。
   */
  function clearTags(): void {
    query.tagIds.splice(0, query.tagIds.length);
  }

  /**
   * 切换某个状态的选中状态。
   * @param status 衣服状态
   */
  function toggleStatus(status: ClothingStatus): void {
    const index = query.statuses.indexOf(status);
    if (index >= 0) query.statuses.splice(index, 1);
    else query.statuses.push(status);
  }

  /**
   * 设置"只看收藏"。
   * @param value 是否只看收藏
   */
  function setFavoriteOnly(value: boolean): void {
    query.favoriteOnly = value;
  }

  /**
   * 设置排序方式。
   * @param key 排序键
   */
  function setSortKey(key: SortKey): void {
    sortKey.value = key;
  }

  /**
   * 清空全部筛选条件（保留排序）。
   */
  function reset(): void {
    query.keyword = '';
    query.wardrobeIds.splice(0, query.wardrobeIds.length);
    query.tagIds.splice(0, query.tagIds.length);
    query.statuses.splice(0, query.statuses.length);
    query.favoriteOnly = false;
  }

  return {
    query,
    sortKey,
    visibleItems,
    computing,
    hasFilter,
    refresh,
    setKeyword,
    toggleWardrobe,
    clearWardrobes,
    setOnlyWardrobe,
    toggleTag,
    clearTags,
    toggleStatus,
    setFavoriteOnly,
    setSortKey,
    reset
  };
});
