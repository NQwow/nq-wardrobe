/**
 * FavoriteButton：收藏按钮。
 * 方块造型 + 心形图标；选中时填色并整体变成粉色块，形状也一并变化（不只依赖颜色）。
 */
<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue';

const props = withDefaults(
  defineProps<{
    /** 是否已收藏 */
    active: boolean;
    /** 尺寸 */
    size?: 'sm' | 'md';
    /** 是否禁用点击 */
    disabled?: boolean;
    /** 无障碍标签（默认按状态生成） */
    label?: string;
  }>(),
  {
    size: 'md',
    disabled: false,
    label: ''
  }
);

const emit = defineEmits<{
  /** 点击切换收藏 */
  (event: 'toggle'): void;
}>();

/**
 * 点击处理：阻止冒泡避免触发卡片跳转。
 * @param event 鼠标事件
 */
function handleClick(event: MouseEvent): void {
  event.stopPropagation();
  if (props.disabled) return;
  emit('toggle');
}
</script>

<template>
  <button
    class="fav"
    :class="[`fav--${props.size}`, { 'fav--on': props.active }]"
    type="button"
    :aria-label="props.label || (props.active ? '取消收藏' : '收藏')"
    :aria-pressed="props.active"
    @click="handleClick"
  >
    <AppIcon name="heart" :size="props.size === 'sm' ? 15 : 19" :filled="props.active" :stroke-width="2.6" />
  </button>
</template>

<style scoped>
.fav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

.fav--sm {
  width: 30px;
  height: 30px;
}

.fav--md {
  width: 40px;
  height: 40px;
}

@media (hover: hover) and (pointer: fine) {
  .fav:hover {
    background-color: var(--m-pink);
    box-shadow: var(--m-shadow-sm);
  }
}

.fav:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* 已收藏：粉底 + 填充心形，形状与颜色同时变化 */
.fav--on {
  background-color: var(--m-pink);
  color: var(--m-ink);
}
</style>
