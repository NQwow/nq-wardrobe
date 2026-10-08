/**
 * OutfitSlot：搭配画布上的一个槽位。
 * 一个槽位可以放多件衣服（叠穿），因此做成横向一行：槽位名 + 已选缩略图 + 添加按钮。
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
    /** 该槽位已选的衣服，按叠穿顺序 */
    clothes?: OutfitSlotClothing[];
    /** 是否处于选中态（素材区正在为该槽位选衣服） */
    active?: boolean;
  }>(),
  {
    clothes: () => [],
    active: false
  }
);

const emit = defineEmits<{
  /** 点击添加按钮或槽位名：把该槽位设为当前选衣目标 */
  (event: 'select', slot: OutfitSlot): void;
  /** 清空整个槽位 */
  (event: 'clear', slot: OutfitSlot): void;
  /** 移除槽位中的某一件 */
  (event: 'remove', slot: OutfitSlot, clothingId: string): void;
}>();

/** 槽位标题 */
const label = computed(() => OUTFIT_SLOT_LABEL[props.slot]);

/** 是否已放入衣服 */
const hasClothes = computed(() => props.clothes.length > 0);

/**
 * 移除其中一件（阻止冒泡，避免同时把该槽位设为选衣目标）。
 * @param event 鼠标事件
 * @param clothingId 衣服 id
 */
function handleRemove(event: MouseEvent, clothingId: string): void {
  event.stopPropagation();
  emit('remove', props.slot, clothingId);
}

/**
 * 清空整个槽位（阻止冒泡）。
 * @param event 鼠标事件
 */
function handleClear(event: MouseEvent): void {
  event.stopPropagation();
  emit('clear', props.slot);
}
</script>

<template>
  <div class="slot" :class="{ 'slot--active': props.active, 'slot--filled': hasClothes }">
    <button class="slot__label" type="button" :aria-pressed="props.active" @click="emit('select', props.slot)">
      {{ label }}
    </button>

    <div class="slot__items scroll-x">
      <div v-for="item in props.clothes" :key="item.id" class="slot__thumb">
        <img v-if="item.thumbnailUrl" class="slot__image" :src="item.thumbnailUrl" :alt="item.name" />
        <span v-else class="slot__fallback">
          <AppIcon name="hanger" :size="18" :stroke-width="2.2" />
        </span>
        <button
          class="slot__remove"
          type="button"
          :aria-label="`把「${item.name}」移出${label}`"
          @click="handleRemove($event, item.id)"
        >
          <AppIcon name="close" :size="10" :stroke-width="4" />
        </button>
      </div>

      <button class="slot__add" type="button" :aria-label="`往${label}里添加衣服`" @click="emit('select', props.slot)">
        <AppIcon name="plus" :size="18" :stroke-width="3" />
        <span v-if="!hasClothes" class="slot__add-text">添加</span>
      </button>
    </div>

    <button
      v-if="hasClothes"
      class="slot__clear"
      type="button"
      :aria-label="`清空${label}`"
      @click="handleClear"
    >
      <AppIcon name="trash" :size="14" :stroke-width="2.6" />
    </button>
  </div>
</template>

<style scoped>
.slot {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  padding: var(--m-2);
  border: var(--m-line);
  background-color: var(--m-surface);
  transition: var(--m-transition);
}

/* 选中态：整行换成青底，明确告诉用户「现在往这里加衣服」 */
.slot--active {
  background-color: var(--m-cyan);
  box-shadow: var(--m-shadow-xs);
}

.slot__label {
  flex: 0 0 auto;
  width: 52px;
  padding: var(--m-2) 0;
  border: none;
  background-color: transparent;
  color: var(--m-text);
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-black);
  text-align: center;
  line-height: 1.3;
}

.slot--active .slot__label {
  color: var(--m-on-accent);
}

.slot__items {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--m-2);
  padding: 2px 2px 2px var(--m-3);
  border-left: 2px dashed var(--m-line-color);
}

.slot__thumb {
  position: relative;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-surface-2);
  overflow: hidden;
}

.slot__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--m-text-muted);
}

.slot__remove {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-left: 2px solid var(--m-line-color);
  border-bottom: 2px solid var(--m-line-color);
  background-color: var(--m-surface);
  color: var(--m-text);
}

.slot__remove:hover {
  background-color: var(--m-red);
}

.slot__add {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: var(--m-2);
  min-width: 52px;
  height: 52px;
  padding: 0 var(--m-3);
  border: 2px dashed var(--m-line-color);
  background-color: var(--m-surface);
  color: var(--m-text-muted);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .slot__add:hover {
    background-color: var(--m-yellow);
    color: var(--m-ink);
  }
}

.slot--active .slot__add {
  border-style: solid;
  background-color: var(--m-canvas);
  color: var(--m-text);
}

.slot__add-text {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
}

.slot__clear {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-surface);
  color: var(--m-text);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .slot__clear:hover {
    background-color: var(--m-red);
  }
}
</style>
