/**
 * StatusBadge：衣服状态徽章。
 * 用「方块/圆点图形 + 文案」双重表达状态，不只依赖颜色。
 */
<script setup lang="ts">
import { computed } from 'vue';
import { CLOTHING_STATUS_LABEL, type ClothingStatus } from '@/models';

const props = withDefaults(
  defineProps<{
    /** 状态 */
    status: ClothingStatus;
    /** 是否可点击切换 */
    clickable?: boolean;
  }>(),
  {
    clickable: false
  }
);

const emit = defineEmits<{
  /** 点击徽章 */
  (event: 'click'): void;
}>();

/** 展示文案 */
const label = computed(() => CLOTHING_STATUS_LABEL[props.status]);
</script>

<template>
  <component
    :is="props.clickable ? 'button' : 'span'"
    class="status"
    :class="[`status--${props.status}`, { 'status--clickable': props.clickable }]"
    :type="props.clickable ? 'button' : undefined"
    @click="props.clickable && emit('click')"
  >
    <span class="status__dot" aria-hidden="true" />
    {{ label }}
  </component>
</template>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--m-2);
  padding: 3px var(--m-3);
  border: var(--m-line);
  border-radius: var(--m-radius-pill);
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-black);
  line-height: 1.7;
  white-space: nowrap;
}

/* 正常：绿色实心圆 */
.status--normal {
  background-color: var(--m-green);
  color: var(--m-on-accent);
}

.status--normal .status__dot {
  background-color: var(--m-ink);
  border-radius: 50%;
}

/* 待清洗：黄色底 + 方块，形状与「正常」不同 */
.status--to_wash {
  background-color: var(--m-yellow);
  color: var(--m-on-accent);
}

.status--to_wash .status__dot {
  background-color: var(--m-ink);
}

.status__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
}

.status--clickable {
  cursor: pointer;
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .status--clickable:hover {
    box-shadow: var(--m-shadow-xs);
  }
}

.status--clickable:active {
  transform: translate(2px, 2px);
}
</style>
