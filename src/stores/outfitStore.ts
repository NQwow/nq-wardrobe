/**
 * 搭配 store：搭配列表与当前编辑中的画布状态。
 *
 * 说明：第一阶段不实现搭配页面，这里先把状态结构备好，
 * 画布交互（槽位选择、保存）留到第二阶段。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { outfitService } from '@/services';
import { createId } from '@/utils/id';
import { OUTFIT_SLOTS, type Outfit, type OutfitItem, type OutfitSlot } from '@/models';

/** 画布上的一个槽位条目（尚未落库） */
export interface CanvasSlotItem {
  /** 衣服 id */
  clothingId: string;
  /** 槽位 */
  slot: OutfitSlot;
}

export const useOutfitStore = defineStore('outfit', () => {
  /** 已保存的搭配列表 */
  const list = ref<Outfit[]>([]);
  /** 加载中 */
  const loading = ref(false);

  /** 当前画布：槽位 → 衣服 id */
  const canvas = ref<Record<OutfitSlot, string | undefined>>({
    top: undefined,
    bottom: undefined,
    dress: undefined,
    outerwear: undefined,
    shoes: undefined,
    bag: undefined,
    accessory: undefined,
    other: undefined
  });
  /** 当前编辑的搭配名 */
  const canvasName = ref('');
  /** 当前编辑的搭配备注 */
  const canvasNote = ref('');
  /** 正在编辑的搭配 id（为空表示新建） */
  const editingId = ref('');

  /** 画布中已放入的衣服数量 */
  const canvasCount = computed(() => OUTFIT_SLOTS.filter((slot) => canvas.value[slot]).length);

  /** 收藏的搭配 */
  const favorites = computed(() => list.value.filter((item) => item.favorite));

  /**
   * 加载搭配列表。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      list.value = await outfitService.list();
    } finally {
      loading.value = false;
    }
  }

  /**
   * 把某件衣服填入槽位（再次点击同一件则移除）。
   * @param slot 槽位
   * @param clothingId 衣服 id
   * @returns 操作后该槽位是否仍占用
   */
  function toggleSlot(slot: OutfitSlot, clothingId: string): boolean {
    if (canvas.value[slot] === clothingId) {
      canvas.value[slot] = undefined;
      return false;
    }
    canvas.value[slot] = clothingId;
    return true;
  }

  /**
   * 清空某个槽位。
   * @param slot 槽位
   */
  function clearSlot(slot: OutfitSlot): void {
    canvas.value[slot] = undefined;
  }

  /**
   * 清空整个画布。
   */
  function clearCanvas(): void {
    for (const slot of OUTFIT_SLOTS) canvas.value[slot] = undefined;
    canvasName.value = '';
    canvasNote.value = '';
    editingId.value = '';
  }

  /**
   * 加载已保存的搭配到画布。
   * @param outfit 搭配本体
   * @param items 搭配项
   */
  function loadToCanvas(outfit: Outfit, items: OutfitItem[]): void {
    clearCanvas();
    editingId.value = outfit.id;
    canvasName.value = outfit.name;
    canvasNote.value = outfit.note ?? '';
    for (const item of items) {
      canvas.value[item.slot] = item.clothingId;
    }
  }

  /**
   * 保存当前画布。
   * @returns 保存后的搭配
   */
  async function saveCanvas(): Promise<Outfit> {
    const items: CanvasSlotItem[] = OUTFIT_SLOTS.filter((slot) => canvas.value[slot]).map((slot) => ({
      slot,
      clothingId: canvas.value[slot] as string
    }));
    const saved = await outfitService.save({
      id: editingId.value || undefined,
      name: canvasName.value,
      note: canvasNote.value,
      items
    });
    editingId.value = saved.id;
    await load();
    return saved;
  }

  /**
   * 切换收藏。
   * @param id 搭配 id
   * @returns 切换后的收藏状态
   */
  async function toggleFavorite(id: string): Promise<boolean> {
    const favorite = await outfitService.toggleFavorite(id);
    const target = list.value.find((item) => item.id === id);
    if (target) target.favorite = favorite;
    return favorite;
  }

  /**
   * 删除搭配。
   * @param id 搭配 id
   */
  async function remove(id: string): Promise<void> {
    await outfitService.remove(id);
    await load();
  }

  return {
    list,
    loading,
    canvas,
    canvasName,
    canvasNote,
    editingId,
    canvasCount,
    favorites,
    load,
    toggleSlot,
    clearSlot,
    clearCanvas,
    loadToCanvas,
    saveCanvas,
    toggleFavorite,
    remove
  };
});

/** 生成一个随机的槽位条目 id（画布本地使用） */
export function createCanvasItemId(): string {
  return createId();
}
