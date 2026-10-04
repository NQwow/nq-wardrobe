/**
 * 日记 store：日记列表与新增。
 *
 * 说明：第一阶段只做占位页，store 先备好，日历视图留到第二阶段。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { diaryService, type DiaryDraft } from '@/services';
import type { Clothing, DiaryEntry } from '@/models';

export const useDiaryStore = defineStore('diary', () => {
  /** 日记列表（按日期倒序） */
  const list = ref<DiaryEntry[]>([]);
  /** "很久没穿"的衣服 */
  const longUnworn = ref<Clothing[]>([]);
  /** 加载中 */
  const loading = ref(false);

  /** 日记总数 */
  const total = computed(() => list.value.length);

  /**
   * 加载日记列表与"很久没穿"统计。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      const [entries, unworn] = await Promise.all([diaryService.list(), diaryService.listLongUnworn(20)]);
      list.value = entries;
      longUnworn.value = unworn;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存日记（同一天覆盖）。
   * @param draft 日记草稿
   * @returns 保存后的日记
   */
  async function save(draft: DiaryDraft): Promise<DiaryEntry> {
    const saved = await diaryService.save(draft);
    await load();
    return saved;
  }

  /**
   * 删除日记。
   * @param id 日记 id
   */
  async function remove(id: string): Promise<void> {
    await diaryService.remove(id);
    await load();
  }

  return { list, longUnworn, loading, total, load, save, remove };
});
