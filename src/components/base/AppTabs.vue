/**
 * AppTabs：孟菲斯分段切换器（搭配素材区、标签管理分组复用）。
 */
<script setup lang="ts">
import type { GeoColor, TabItem } from './types';

const props = withDefaults(
  defineProps<{
    /** 当前选中键（v-model） */
    modelValue: string;
    /** 标签项 */
    tabs: TabItem[];
    /** 是否撑满宽度 */
    stretch?: boolean;
    /** 选中项撞色 */
    tone?: GeoColor;
  }>(),
  {
    stretch: false,
    tone: 'cyan'
  }
);

const emit = defineEmits<{
  /** 选中项变化 */
  (event: 'update:modelValue', value: string): void;
  /** 选中项变化（带完整项数据） */
  (event: 'change', value: string): void;
}>();

/**
 * 点击某个标签。
 * @param key 标签键
 */
function select(key: string): void {
  if (key === props.modelValue) return;
  emit('update:modelValue', key);
  emit('change', key);
}
</script>

<template>
  <div class="tabs" :class="{ 'tabs--stretch': props.stretch }" role="tablist">
    <button
      v-for="tab in props.tabs"
      :key="tab.key"
      class="tabs__item"
      :class="[`tabs__item--${props.tone}`, { 'tabs__item--active': tab.key === props.modelValue }]"
      type="button"
      role="tab"
      :aria-selected="tab.key === props.modelValue"
      @click="select(tab.key)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge" class="tabs__badge m-mono">{{ tab.badge }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0;
  background-color: var(--m-surface);
  border: var(--m-line);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--m-2);
  flex: 1 0 auto;
  padding: var(--m-3) var(--m-4);
  min-height: 46px;
  border: none;
  border-right: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
  white-space: nowrap;
  transition: var(--m-transition);
}

.tabs__item:last-child {
  border-right: none;
}

@media (hover: hover) and (pointer: fine) {
  .tabs__item:hover:not(.tabs__item--active) {
    background-color: var(--m-yellow);
    color: var(--m-ink);
  }
}

/* 选中态：实心撞色 + 黑色粗体 */
.tabs__item--active {
  background-color: var(--tab-tone, var(--m-cyan));
  color: var(--m-ink);
  font-weight: var(--m-weight-black);
  box-shadow: inset 0 -5px 0 0 var(--m-line-color);
}

.tabs__item--red {
  --tab-tone: var(--m-red);
}

.tabs__item--yellow {
  --tab-tone: var(--m-yellow);
}

.tabs__item--cyan {
  --tab-tone: var(--m-cyan);
}

.tabs__item--pink {
  --tab-tone: var(--m-pink);
}

.tabs__item--green {
  --tab-tone: var(--m-green);
}

.tabs__badge {
  min-width: 20px;
  padding: 0 5px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-canvas);
  color: var(--m-text);
  font-size: 11px;
  font-weight: var(--m-weight-black);
  line-height: 16px;
  text-align: center;
}

.tabs--stretch .tabs__item {
  flex: 1 1 0;
}
</style>
