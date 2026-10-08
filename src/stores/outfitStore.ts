/**
 * 搭配 store：搭配列表与当前编辑中的画布状态。
 * 一个槽位可以放多件衣服（叠穿），因此 canvas 的值是衣服 id 数组。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { outfitService, type OutfitSummary } from '@/services';
import { OUTFIT_SLOTS, type Outfit, type OutfitItem, type OutfitSlot } from '@/models';

export const useOutfitStore = defineStore('outfit', () => {
  /** 已保存的搭配摘要（带成员明细），供列表直接展示部件名 */
  const summaries = ref<OutfitSummary[]>([]);
  /** 加载中 */
  const loading = ref(false);

  /** 当前画布：槽位 → 已选衣服 id（按叠穿顺序） */
  const canvas = ref<Record<OutfitSlot, string[]>>({
    top: [],
    bottom: [],
    dress: [],
    outerwear: [],
    shoes: [],
    bag: [],
    accessory: [],
    other: []
  });
  /** 当前编辑的搭配名 */
  const canvasName = ref('');
  /** 当前编辑的搭配备注 */
  const canvasNote = ref('');
  /** 正在编辑的搭配 id（为空表示新建） */
  const editingId = ref('');

  /** 画布中已放入的衣服总件数 */
  const canvasCount = computed(() => OUTFIT_SLOTS.reduce((sum, slot) => sum + canvas.value[slot].length, 0));

  /** 是否存在任何已放入的衣服 */
  const canvasEmpty = computed(() => canvasCount.value === 0);

  /** 已保存的搭配列表（仅搭配本体） */
  const list = computed(() => summaries.value.map((item) => item.outfit));

  /** 收藏的搭配 */
  const favorites = computed(() => list.value.filter((item) => item.favorite));

  /**
   * 加载搭配列表（带成员明细）。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      summaries.value = await outfitService.listSummaries();
    } finally {
      loading.value = false;
    }
  }

  /**
   * 把某件衣服加入槽位；已在槽位里则移除（再次点击取消）。
   * @param slot 槽位
   * @param clothingId 衣服 id
   * @returns 操作后该件衣服是否仍在槽位中
   */
  function toggleSlot(slot: OutfitSlot, clothingId: string): boolean {
    const current = canvas.value[slot];
    const index = current.indexOf(clothingId);
    if (index >= 0) {
      canvas.value[slot] = current.filter((id) => id !== clothingId);
      return false;
    }
    canvas.value[slot] = [...current, clothingId];
    return true;
  }

  /**
   * 从槽位移除某一件（不影响同槽位的其它件）。
   * @param slot 槽位
   * @param clothingId 衣服 id
   */
  function removeFromSlot(slot: OutfitSlot, clothingId: string): void {
    canvas.value[slot] = canvas.value[slot].filter((id) => id !== clothingId);
  }

  /**
   * 清空某个槽位。
   * @param slot 槽位
   */
  function clearSlot(slot: OutfitSlot): void {
    canvas.value[slot] = [];
  }

  /**
   * 清空整个画布并退出编辑态（用于「新建搭配」）。
   */
  function clearCanvas(): void {
    for (const slot of OUTFIT_SLOTS) canvas.value[slot] = [];
    canvasName.value = '';
    canvasNote.value = '';
    editingId.value = '';
  }

  /**
   * 加载已保存的搭配到画布进行编辑。
   * @param outfit 搭配本体
   * @param items 搭配项
   */
  function loadToCanvas(outfit: Outfit, items: OutfitItem[]): void {
    clearCanvas();
    editingId.value = outfit.id;
    canvasName.value = outfit.name;
    canvasNote.value = outfit.note ?? '';
    for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      canvas.value[item.slot] = [...canvas.value[item.slot], item.clothingId];
    }
  }

  /**
   * 保存当前画布（新建或覆盖正在编辑的搭配）。
   * @returns 保存后的搭配
   */
  async function saveCanvas(): Promise<Outfit> {
    const items = OUTFIT_SLOTS.flatMap((slot) =>
      canvas.value[slot].map((clothingId) => ({ slot, clothingId }))
    );
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
    const target = summaries.value.find((item) => item.outfit.id === id);
    if (target) target.outfit.favorite = favorite;
    return favorite;
  }

  /**
   * 删除搭配（软删除，连带清理搭配项）。正在编辑它时一并退出编辑态并清空画布。
   * @param id 搭配 id
   */
  async function remove(id: string): Promise<void> {
    await outfitService.remove(id);
    if (editingId.value === id) clearCanvas();
    await load();
  }

  return {
    summaries,
    list,
    loading,
    canvas,
    canvasName,
    canvasNote,
    editingId,
    canvasCount,
    canvasEmpty,
    favorites,
    load,
    toggleSlot,
    removeFromSlot,
    clearSlot,
    clearCanvas,
    loadToCanvas,
    saveCanvas,
    toggleFavorite,
    remove
  };
});
