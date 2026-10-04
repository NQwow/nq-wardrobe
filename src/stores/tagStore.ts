/**
 * 标签 store：全部标签、按类型分组与一级/二级树。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { tagService, type TagDraft } from '@/services';
import { TAG_TYPES, type Tag, type TagType } from '@/models';

export const useTagStore = defineStore('tag', () => {
  /** 全部标签 */
  const list = ref<Tag[]>([]);
  /** 加载中 */
  const loading = ref(false);

  /** id → 标签 的映射 */
  const byId = computed(() => new Map(list.value.map((item) => [item.id, item])));

  /** 按类型分组的标签列表 */
  const byType = computed(() => {
    const result = {} as Record<TagType, Tag[]>;
    for (const type of TAG_TYPES) {
      result[type] = list.value.filter((item) => item.type === type);
    }
    return result;
  });

  /** 按类型分组的一级/二级树 */
  const tree = computed(() => {
    const result = {} as Record<TagType, { tag: Tag; children: Tag[] }[]>;
    for (const type of TAG_TYPES) {
      const typed = list.value.filter((item) => item.type === type);
      const roots = typed.filter((item) => !item.parentId);
      result[type] = roots.map((tag) => ({
        tag,
        children: typed.filter((item) => item.parentId === tag.id)
      }));
    }
    return result;
  });

  /**
   * 加载全部标签。
   */
  async function load(): Promise<void> {
    loading.value = true;
    try {
      list.value = await tagService.list();
    } finally {
      loading.value = false;
    }
  }

  /**
   * 新增标签。
   * @param draft 标签草稿
   * @returns 新标签
   */
  async function create(draft: TagDraft): Promise<Tag> {
    const created = await tagService.create(draft);
    await load();
    return created;
  }

  /**
   * 更新标签。
   * @param id 标签 id
   * @param patch 待更新字段
   * @returns 更新后的标签
   */
  async function update(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    const updated = await tagService.update(id, patch);
    await load();
    return updated;
  }

  /**
   * 删除标签（连带二级标签）。
   * @param id 标签 id
   * @returns 被删除的标签 id 列表
   */
  async function remove(id: string): Promise<string[]> {
    const removed = await tagService.remove(id);
    await load();
    return removed;
  }

  /**
   * 按 id 取标签名。
   * @param id 标签 id
   * @returns 标签名，找不到时返回空串
   */
  function nameOf(id: string): string {
    return byId.value.get(id)?.name ?? '';
  }

  return { list, loading, byId, byType, tree, load, create, update, remove, nameOf };
});
