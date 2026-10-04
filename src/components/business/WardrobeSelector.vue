/**
 * WardrobeSelector：衣柜多选器。
 * 横向滚动芯片，每个芯片带一个几何标识（形状 + 撞色），支持"全部"。
 */
<script setup lang="ts">
import AppGeo from '@/components/base/AppGeo.vue';
import {
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  isWardrobeShape,
  isWardrobeTone,
  type Wardrobe
} from '@/models';
import type { GeoColor, GeoShape } from '@/components/base/types';

const props = withDefaults(
  defineProps<{
    /** 全部衣柜 */
    wardrobes: Wardrobe[];
    /** 已选中的衣柜 id；空数组表示全部 */
    selectedIds: string[];
    /** 衣柜 id → 衣服数量 */
    counts?: Record<string, number>;
  }>(),
  {
    counts: () => ({})
  }
);

const emit = defineEmits<{
  /** 切换某个衣柜的选中状态 */
  (event: 'toggle', id: string): void;
  /** 选择"全部" */
  (event: 'clear'): void;
}>();

/** 是否处于"全部"状态 */
function isAllActive(): boolean {
  return props.selectedIds.length === 0;
}

/**
 * 取衣柜的标识形状，非法值回退到默认形状。
 * @param wardrobe 衣柜
 * @returns 形状令牌
 */
function shapeOf(wardrobe: Wardrobe): GeoShape {
  return isWardrobeShape(wardrobe.icon) ? wardrobe.icon : DEFAULT_WARDROBE_SHAPE;
}

/**
 * 取衣柜的标识撞色，非法值回退到默认撞色。
 * @param wardrobe 衣柜
 * @returns 撞色令牌
 */
function toneOf(wardrobe: Wardrobe): GeoColor {
  return isWardrobeTone(wardrobe.color) ? wardrobe.color : DEFAULT_WARDROBE_TONE;
}
</script>

<template>
  <div class="wardrobes scroll-x" role="group" aria-label="按衣柜筛选">
    <button
      class="m-chip wardrobes__chip"
      :class="{ 'm-chip--active': isAllActive() }"
      type="button"
      :aria-pressed="isAllActive()"
      @click="emit('clear')"
    >
      全部
    </button>

    <button
      v-for="wardrobe in props.wardrobes"
      :key="wardrobe.id"
      class="m-chip wardrobes__chip"
      :class="{ 'm-chip--active': props.selectedIds.includes(wardrobe.id) }"
      type="button"
      :aria-pressed="props.selectedIds.includes(wardrobe.id)"
      @click="emit('toggle', wardrobe.id)"
    >
      <AppGeo :shape="shapeOf(wardrobe)" :color="toneOf(wardrobe)" size="xs" />
      <span>{{ wardrobe.name }}</span>
      <span v-if="props.counts[wardrobe.id] !== undefined" class="wardrobes__count m-mono">
        {{ props.counts[wardrobe.id] }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.wardrobes {
  gap: var(--m-2);
  padding: 4px 2px 6px;
}

.wardrobes__chip {
  /* 选中态的撞色由全局 .m-chip--active 提供 */
  --m-chip-active: var(--m-cyan);
}

.wardrobes__count {
  font-size: var(--m-fs-xs);
  color: var(--m-text-muted);
}

.wardrobes__chip.m-chip--active .wardrobes__count {
  color: var(--m-on-accent);
}
</style>
