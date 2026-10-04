/**
 * 衣服 store：列表条目、详情、增删改与状态切换。
 * 页面只从这里拿数据，不直接访问 service 之外的数据库。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { clothingService, type ClothingDetail, type ClothingListItem } from '@/services';
import type { Clothing, ClothingFormData, ClothingStatus } from '@/models';

export const useClothingStore = defineStore('clothing', () => {
  /** 全部未删除衣服的列表条目 */
  const items = ref<ClothingListItem[]>([]);
  /** 加载中（用于骨架屏） */
  const loading = ref(false);
  /** 是否已完成过一次加载 */
  const loaded = ref(false);

  /** 收藏的衣服 */
  const favorites = computed(() => items.value.filter((item) => item.clothing.favorite));

  /**
   * 加载全部衣服条目（含衣柜名、标签、缩略图）。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      items.value = await clothingService.listItems();
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 读取衣服详情。
   * @param id 衣服 id
   * @returns 详情或 undefined
   */
  async function getDetail(id: string): Promise<ClothingDetail | undefined> {
    return clothingService.getDetail(id);
  }

  /**
   * 按 id 从已加载列表中取条目。
   * @param id 衣服 id
   * @returns 列表条目或 undefined
   */
  function findItem(id: string): ClothingListItem | undefined {
    return items.value.find((item) => item.clothing.id === id);
  }

  /**
   * 新增衣服。
   * @param form 表单数据
   * @returns 新建的衣服
   */
  async function create(form: ClothingFormData): Promise<Clothing> {
    const created = await clothingService.create(form);
    await load();
    return created;
  }

  /**
   * 更新衣服。
   * @param id 衣服 id
   * @param form 表单数据
   * @returns 更新后的衣服
   */
  async function update(id: string, form: ClothingFormData): Promise<Clothing> {
    const updated = await clothingService.update(id, form);
    await load();
    return updated;
  }

  /**
   * 软删除衣服。
   * @param id 衣服 id
   */
  async function remove(id: string): Promise<void> {
    await clothingService.remove(id);
    await load();
  }

  /**
   * 切换收藏（本地列表同步更新，避免整表重载）。
   * @param id 衣服 id
   * @returns 切换后的收藏状态
   */
  async function toggleFavorite(id: string): Promise<boolean> {
    const favorite = await clothingService.toggleFavorite(id);
    const target = items.value.find((item) => item.clothing.id === id);
    if (target) target.clothing.favorite = favorite;
    return favorite;
  }

  /**
   * 切换状态（正常 / 待清洗）。
   * @param id 衣服 id
   * @param status 目标状态；不传则在两种状态间切换
   * @returns 切换后的状态
   */
  async function setStatus(id: string, status?: ClothingStatus): Promise<ClothingStatus> {
    const next = await clothingService.setStatus(id, status);
    const target = items.value.find((item) => item.clothing.id === id);
    if (target) target.clothing.status = next;
    return next;
  }

  /**
   * 迁移到其它衣柜。
   * @param id 衣服 id
   * @param wardrobeId 目标衣柜 id
   */
  async function moveToWardrobe(id: string, wardrobeId: string): Promise<void> {
    await clothingService.moveToWardrobe(id, wardrobeId);
    await load();
  }

  /**
   * 生成下一个可用编号（新增页初始化用）。
   * @returns 编号字符串
   */
  async function nextCode(): Promise<string> {
    return clothingService.generateCode();
  }

  return {
    items,
    loading,
    loaded,
    favorites,
    load,
    getDetail,
    findItem,
    create,
    update,
    remove,
    toggleFavorite,
    setStatus,
    moveToWardrobe,
    nextCode
  };
});
