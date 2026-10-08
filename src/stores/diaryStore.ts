/**
 * 日记 store：日记列表、按月查询、详情与增删改。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { diaryService, type DiaryDetail, type DiaryDraft } from '@/services';
import { startOfDay } from '@/utils/date';
import type { Clothing, DiaryEntry } from '@/models';

export const useDiaryStore = defineStore('diary', () => {
  /** 全部日记（按日期倒序） */
  const list = ref<DiaryEntry[]>([]);
  /** "很久没穿"的衣服 */
  const longUnworn = ref<Clothing[]>([]);
  /** 加载中 */
  const loading = ref(false);

  /** 日记总数 */
  const total = computed(() => list.value.length);

  /** 日期（当天 0 点）→ 日记 的索引，日历与详情共用 */
  const byDate = computed(() => new Map(list.value.map((entry) => [startOfDay(entry.date), entry])));

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
   * 读取日记详情（含关联搭配与衣服）。
   * @param id 日记 id
   * @returns 详情或 undefined
   */
  async function getDetail(id: string): Promise<DiaryDetail | undefined> {
    return diaryService.getDetail(id);
  }

  /**
   * 按日期取日记。
   * @param timestamp 当天任意时刻的时间戳
   * @returns 日记或 undefined
   */
  function findByDate(timestamp: number): DiaryEntry | undefined {
    return byDate.value.get(startOfDay(timestamp));
  }

  /**
   * 保存日记（同一天覆盖，因此修改走的是同一个方法）。
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

  return { list, longUnworn, loading, total, byDate, load, getDetail, findByDate, save, remove };
});
