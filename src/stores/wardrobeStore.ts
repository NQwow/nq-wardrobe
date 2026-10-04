/**
 * 衣柜 store：衣柜列表、各衣柜衣服数量、当前默认衣柜。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { settingsService, wardrobeService } from '@/services';
import type { Wardrobe, WardrobeDraft } from '@/models';

export const useWardrobeStore = defineStore('wardrobe', () => {
  /** 衣柜列表（按 sortOrder 升序） */
  const list = ref<Wardrobe[]>([]);
  /** 衣柜 id → 衣服数量 */
  const counts = ref<Record<string, number>>({});
  /** 默认衣柜 id */
  const defaultWardrobeId = ref('');
  /** 加载中 */
  const loading = ref(false);

  /** id → 衣柜 的映射，供卡片快速取名 */
  const byId = computed(() => new Map(list.value.map((item) => [item.id, item])));

  /** 默认衣柜（不存在时取第一个） */
  const defaultWardrobe = computed(
    () => list.value.find((item) => item.id === defaultWardrobeId.value) ?? list.value[0]
  );

  /**
   * 加载衣柜列表与数量统计。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [wardrobes, countMap, defaultId] = await Promise.all([
        wardrobeService.list(),
        wardrobeService.countAllClothes(),
        settingsService.getDefaultWardrobeId()
      ]);
      list.value = wardrobes;
      counts.value = countMap;

      const valid = wardrobes.some((item) => item.id === defaultId);
      defaultWardrobeId.value = valid ? defaultId : (wardrobes[0]?.id ?? '');
      if (!valid && defaultWardrobeId.value) {
        await settingsService.setDefaultWardrobeId(defaultWardrobeId.value);
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * 新增衣柜。
   * @param draft 衣柜草稿
   * @returns 创建后的衣柜
   */
  async function create(draft: WardrobeDraft): Promise<Wardrobe> {
    const created = await wardrobeService.create(draft);
    await load();
    return created;
  }

  /**
   * 更新衣柜。
   * @param id 衣柜 id
   * @param patch 待更新字段
   * @returns 更新后的衣柜
   */
  async function update(id: string, patch: Partial<WardrobeDraft>): Promise<Wardrobe> {
    const updated = await wardrobeService.update(id, patch);
    await load();
    return updated;
  }

  /**
   * 删除衣柜，衣服迁移到目标衣柜。
   * @param id 待删除衣柜 id
   * @param targetWardrobeId 迁移目标
   * @returns 迁移的衣服数量
   */
  async function remove(id: string, targetWardrobeId?: string): Promise<number> {
    const result = await wardrobeService.remove(id, targetWardrobeId);
    await load();
    return result.migratedCount;
  }

  /**
   * 上移 / 下移衣柜。
   * @param id 衣柜 id
   * @param direction -1 上移，1 下移
   * @returns 是否发生移动
   */
  async function move(id: string, direction: -1 | 1): Promise<boolean> {
    const moved = await wardrobeService.move(id, direction);
    if (moved) await load();
    return moved;
  }

  /**
   * 设置默认衣柜。
   * @param id 衣柜 id
   */
  async function setDefault(id: string): Promise<void> {
    await settingsService.setDefaultWardrobeId(id);
    defaultWardrobeId.value = id;
  }

  return {
    list,
    counts,
    defaultWardrobeId,
    loading,
    byId,
    defaultWardrobe,
    load,
    create,
    update,
    remove,
    move,
    setDefault
  };
});
