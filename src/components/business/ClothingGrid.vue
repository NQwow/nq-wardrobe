/**
 * ClothingGrid：衣服网格容器。
 * 响应式列数（手机 2 列 → 桌面 5 列），统一处理骨架屏与空状态。
 */
<script setup lang="ts">
import AppEmpty from '@/components/base/AppEmpty.vue';
import ClothingCard from './ClothingCard.vue';
import type { EmptyMotif } from '@/components/base/types';
import type { ClothingListItem } from '@/services';

const props = withDefaults(
  defineProps<{
    /** 列表数据 */
    items: ClothingListItem[];
    /** 是否加载中（显示骨架屏） */
    loading?: boolean;
    /** 空状态标题 */
    emptyTitle?: string;
    /** 空状态说明 */
    emptyDescription?: string;
    /** 空状态插画主题 */
    emptyMotif?: EmptyMotif;
  }>(),
  {
    loading: false,
    emptyTitle: '还没有衣服',
    emptyDescription: '',
    emptyMotif: 'hanger'
  }
);

const emit = defineEmits<{
  /** 点击卡片 */
  (event: 'select', id: string): void;
  /** 点击收藏 */
  (event: 'favorite', id: string): void;
}>();

/** 骨架屏占位数量（手机端只显示前 4 个，用 CSS 控制） */
const SKELETON_COUNT = 8;
</script>

<template>
  <div class="grid-wrap">
    <div v-if="props.loading && !props.items.length" class="grid" aria-busy="true">
      <div v-for="index in SKELETON_COUNT" :key="index" class="grid__skeleton">
        <div class="skeleton grid__skeleton-media" />
        <div class="skeleton grid__skeleton-line" />
        <div class="skeleton grid__skeleton-line grid__skeleton-line--short" />
      </div>
    </div>

    <div v-else-if="props.items.length" class="grid">
      <ClothingCard
        v-for="item in props.items"
        :key="item.clothing.id"
        :item="item"
        @select="emit('select', $event)"
        @favorite="emit('favorite', $event)"
      />
    </div>

    <AppEmpty
      v-else
      :motif="props.emptyMotif"
      :title="props.emptyTitle"
      :description="props.emptyDescription"
    >
      <slot />
    </AppEmpty>
  </div>
</template>

<style scoped>
.grid-wrap {
  min-height: 140px;
}

/* 手机 2 列 → 平板 3 列 → 桌面 4~5 列 */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m-4);
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--m-5);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--m-5);
  }
}

@media (min-width: 1440px) {
  .grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.grid__skeleton {
  border: var(--m-line);
  background-color: var(--m-surface);
  padding-bottom: var(--m-3);
}

.grid__skeleton-media {
  aspect-ratio: 3 / 4;
  border-bottom: var(--m-line);
}

.grid__skeleton-line {
  height: 12px;
  margin: var(--m-3) var(--m-3) 0;
}

.grid__skeleton-line--short {
  width: 55%;
  margin-top: var(--m-2);
}
</style>
