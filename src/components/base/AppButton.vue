/**
 * AppButton：孟菲斯按钮。
 * 粗黑描边 + 无模糊硬阴影；hover 换撞色并「增大」阴影，按下时完全贴地。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { ButtonSize, ButtonTone, ButtonType, IconName } from './types';

const props = withDefaults(
  defineProps<{
    /** 语义类型 */
    type?: ButtonType;
    /** 撞色（primary / secondary / ghost 使用） */
    tone?: ButtonTone;
    /** 尺寸 */
    size?: ButtonSize;
    /** 是否独占一行 */
    block?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否展示加载中 */
    loading?: boolean;
    /** 是否使用原生 submit 行为 */
    nativeType?: 'button' | 'submit';
    /** 左侧图标 */
    icon?: IconName;
  }>(),
  {
    type: 'primary',
    tone: 'yellow',
    size: 'md',
    block: false,
    disabled: false,
    loading: false,
    nativeType: 'button',
    icon: undefined
  }
);

const emit = defineEmits<{
  /** 点击事件；禁用或加载中不会触发 */
  (event: 'click', payload: MouseEvent): void;
}>();

/** 是否处于不可点击状态 */
const isDisabled = computed(() => props.disabled || props.loading);

/** 视觉类名：danger / text 覆盖 tone，其余按 type 组合 */
const classes = computed(() => {
  const list: string[] = ['m-btn', `m-btn--${props.size}`];

  switch (props.type) {
    case 'danger':
      list.push('m-btn--red');
      break;
    case 'text':
      list.push('m-btn--text');
      break;
    case 'secondary':
      list.push(`m-btn--${props.tone}`, 'm-btn--outline');
      break;
    case 'ghost':
      list.push(`m-btn--${props.tone}`, 'm-btn--outline', 'm-btn--flat');
      break;
    case 'primary':
    default:
      list.push(`m-btn--${props.tone}`);
      break;
  }

  if (props.block) list.push('m-btn--block');
  return list;
});

/**
 * 点击处理：禁用态直接忽略。
 * @param event 鼠标事件
 */
function handleClick(event: MouseEvent): void {
  if (isDisabled.value) return;
  emit('click', event);
}
</script>

<template>
  <button
    :class="classes"
    :type="props.nativeType"
    :disabled="isDisabled"
    :aria-busy="props.loading || undefined"
    @click="handleClick"
  >
    <span v-if="props.loading" class="btn__spinner" aria-hidden="true" />
    <AppIcon v-else-if="props.icon" :name="props.icon" :size="props.size === 'sm' ? 16 : 19" :stroke-width="2.6" />
    <span class="btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.btn__label {
  display: inline-block;
}

/* 加载指示：用方块的旋转替代圆形 spinner，保持几何语言 */
.btn__spinner {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  background-color: currentColor;
  animation: btn-spin 0.75s steps(4, end) infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn__spinner {
    animation: none;
  }
}
</style>
