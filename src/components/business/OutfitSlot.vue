/**
 * OutfitSlot：搭配画布上的一个槽位。
 * 空槽位是虚线方格，放入衣服后变成实线图片块。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/base/AppIcon.vue';
import { OUTFIT_SLOT_LABEL, type OutfitSlot } from '@/models';
import type { OutfitSlotClothing } from './types';

const props = withDefaults(
  defineProps<{
    /** 槽位类型 */
    slot: OutfitSlot;
    /** 已放入的衣服，为空表示空槽位 */
    clothing?: OutfitSlotClothing | null;
    /** 是否处于选中态（素材区正在为该槽位选衣服） */
    active?: boolean;
  }>(),
  {
    clothing: null,
    active: false
  }
);

const emit = defineEmits<{
  /** 点击槽位（选中该槽位用于选衣） */
  (event: 'select', slot: OutfitSlot): void;
  /** 清空槽位 */
  (event: 'clear', slot: OutfitSlot): void;
}>();

/** 槽位标题 */
const label = computed(() => OUTFIT_SLOT_LABEL[props.slot]);

/**
 * 清空槽位（阻止冒泡，避免同时触发选中）。
 * @param event 鼠标事件
 */
function handleClear(event: MouseEvent): void {
  event.stopPropagation();
  emit('clear', props.slot);
}
</script>

<template>
  <div
    class="slot"
    :class="{ 'slot--active': props.active, 'slot--filled': Boolean(props.clothing) }"
  >
    <button
      class="slot__body"
      type="button"
      :aria-label="`${label}${props.clothing ? `：${props.clothing.name}` : '（空）'}`"
      :aria-pressed="props.active"
      @click="emit('select', props.slot)"
    >
      <img
        v-if="props.clothing?.thumbnailUrl"
        class="slot__image"
        :src="props.clothing.thumbnailUrl"
        :alt="props.clothing.name"
      />
      <span v-else-if="props.clothing" class="slot__fallback">
        <AppIcon name="hanger" :size="24" :stroke-width="2.2" />
      </span>
      <span v-else class="slot__plus">
        <AppIcon name="plus" :size="20" :stroke-width="3" />
      </span>
    </button>

    <button
      v-if="props.clothing"
      class="slot__clear"
      type="button"
      :aria-label="`移出${label}`"
      @click="handleClear"
    >
      <AppIcon name="close" :size="12" :stroke-width="3.4" />
    </button>

    <span class="slot__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.slot {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--m-1);
}

.slot__body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: var(--m-line);
  border-style: dashed;
  background-color: var(--m-surface);
  color: var(--m-text-muted);
  transition: var(--m-transition);
}

.slot--filled .slot__body {
  border-style: solid;
}

@media (hover: hover) and (pointer: fine) {
  .slot__body:hover {
    background-color: var(--m-yellow);
    color: var(--m-ink);
    box-shadow: var(--m-shadow-xs);
  }
}

.slot__body:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* 选中态：实心青底 + 硬阴影，与普通槽位明显区分 */
.slot--active .slot__body {
  border-style: solid;
  border-color: var(--m-line-color);
  background-color: var(--m-cyan);
  box-shadow: var(--m-shadow-sm);
  color: var(--m-ink);
}

.slot__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot__fallback,
.slot__plus {
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot__clear {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  transition: var(--m-transition);
}

.slot__clear:hover {
  background-color: var(--m-red);
}

.slot__label {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  color: var(--m-text-muted);
  text-align: center;
}

.slot--active .slot__label {
  color: var(--m-text);
}
</style>
