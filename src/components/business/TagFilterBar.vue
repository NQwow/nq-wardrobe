/**
 * TagFilterBar：标签筛选入口。
 * 一个芯片按钮打开底部抽屉，抽屉内按类型分页展示标签。
 */
<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppModal from '@/components/base/AppModal.vue';
import AppTabs from '@/components/base/AppTabs.vue';
import type { TabItem } from '@/components/base/types';
import { useTagStore } from '@/stores';
import { TAG_TYPES, TAG_TYPE_LABEL, type TagType } from '@/models';

const props = defineProps<{
  /** 已选中的标签 id */
  selectedIds: string[];
}>();

const emit = defineEmits<{
  /** 切换某个标签 */
  (event: 'toggle', tagId: string): void;
  /** 清空全部标签筛选 */
  (event: 'clear'): void;
}>();

const tagStore = useTagStore();

/** 抽屉显隐 */
const visible = ref(false);
/** 抽屉内当前类型 */
const activeType = ref<TagType>('category');

/** 类型切换 tab（角标显示该类型已选数量） */
const tabs = computed<TabItem[]>(() =>
  TAG_TYPES.map((type) => ({
    key: type,
    label: TAG_TYPE_LABEL[type],
    badge: (tagStore.byType[type] ?? []).filter((tag) => props.selectedIds.includes(tag.id)).length
  }))
);

/** 当前类型的标签树 */
const tree = computed(() => tagStore.tree[activeType.value] ?? []);

/** 已选标签名，用于按钮上回显 */
const selectedNames = computed(() =>
  props.selectedIds.map((id) => tagStore.nameOf(id)).filter(Boolean).join('、')
);

/**
 * 判断标签是否已选中。
 * @param tagId 标签 id
 * @returns 是否选中
 */
function isSelected(tagId: string): boolean {
  return props.selectedIds.includes(tagId);
}

/** 清空筛选并关闭抽屉 */
function clearAll(): void {
  emit('clear');
  visible.value = false;
}
</script>

<template>
  <div class="filter">
    <button
      class="m-chip filter__trigger"
      :class="{ 'm-chip--active': props.selectedIds.length > 0 }"
      type="button"
      @click="visible = true"
    >
      <AppIcon name="tag" :size="15" :stroke-width="2.8" />
      <span>{{ props.selectedIds.length ? `标签 ${props.selectedIds.length}` : '标签筛选' }}</span>
    </button>

    <AppModal v-model="visible" title="标签筛选" subtitle="可跨类型多选，命中任意一个即显示" tone="yellow" position="bottom">
      <AppTabs v-model="activeType" :tabs="tabs" tone="yellow" />

      <div class="filter__panel">
        <p v-if="!tree.length" class="m-hint">该分类下还没有标签</p>

        <div v-for="node in tree" :key="node.tag.id" class="filter__group">
          <button
            class="filter__chip"
            :class="{ 'filter__chip--on': isSelected(node.tag.id) }"
            type="button"
            :aria-pressed="isSelected(node.tag.id)"
            @click="emit('toggle', node.tag.id)"
          >
            {{ node.tag.name }}
          </button>

          <button
            v-for="child in node.children"
            :key="child.id"
            class="filter__chip filter__chip--child"
            :class="{ 'filter__chip--on': isSelected(child.id) }"
            type="button"
            :aria-pressed="isSelected(child.id)"
            @click="emit('toggle', child.id)"
          >
            {{ child.name }}
          </button>
        </div>
      </div>

      <p v-if="selectedNames" class="filter__selected ellipsis">已选：{{ selectedNames }}</p>

      <template #footer>
        <AppButton type="secondary" tone="red" :disabled="!props.selectedIds.length" @click="clearAll">
          清空
        </AppButton>
        <AppButton tone="green" @click="visible = false">完成</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.filter__trigger {
  --m-chip-active: var(--m-yellow);
}

.filter__panel {
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
  margin-top: var(--m-4);
}

.filter__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
  padding: 3px;
  border: var(--m-bw) dashed var(--m-line-color);
}

.filter__chip {
  padding: 6px var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .filter__chip:hover {
    background-color: var(--m-pink);
    color: var(--m-ink);
  }
}

.filter__chip:active {
  transform: translate(2px, 2px);
}

.filter__chip--on {
  background-color: var(--m-green);
  color: var(--m-ink);
  font-weight: var(--m-weight-black);
  box-shadow: var(--m-shadow-xs);
}

.filter__chip--child {
  font-size: var(--m-fs-xs);
  border-style: dashed;
  color: var(--m-text-soft);
}

.filter__chip--child.filter__chip--on {
  border-style: solid;
  background-color: var(--m-cyan);
  color: var(--m-ink);
}

.filter__selected {
  margin-top: var(--m-4);
  padding-top: var(--m-3);
  border-top: 2px dashed var(--m-line-color);
  font-size: var(--m-fs-xs);
  color: var(--m-text-muted);
}
</style>
