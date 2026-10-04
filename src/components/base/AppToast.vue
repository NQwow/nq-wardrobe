/**
 * AppToast：全局轻提示容器，状态来自 useToast。
 * 手机端顶部居中，桌面端右上角。
 */
<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import { useToast } from '@/composables/useToast';
import type { IconName } from './types';

const { toasts, remove } = useToast();

/** 各类型对应的图标 */
const ICON: Record<string, IconName> = {
  success: 'check',
  error: 'alert',
  info: 'alert'
};

/**
 * 取提示类型对应的图标。
 * @param type 提示类型
 * @returns 图标名
 */
function iconOf(type: string): IconName {
  return ICON[type] ?? 'alert';
}
</script>

<template>
  <Teleport to="body">
    <div class="toast" role="status" aria-live="polite">
      <TransitionGroup name="m-rise">
        <button
          v-for="item in toasts"
          :key="item.id"
          class="toast__item"
          :class="`toast__item--${item.type}`"
          type="button"
          @click="remove(item.id)"
        >
          <span class="toast__icon">
            <AppIcon :name="iconOf(item.type)" :size="15" :stroke-width="3" />
          </span>
          <span class="toast__text">{{ item.message }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  top: calc(var(--m-safe-t) + var(--m-4));
  left: 0;
  right: 0;
  z-index: 1400;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--m-3);
  padding: 0 var(--m-4);
  pointer-events: none;
}

@media (min-width: 700px) {
  .toast {
    left: auto;
    right: var(--m-6);
    align-items: flex-end;
    padding: 0;
  }
}

.toast__item {
  display: flex;
  align-items: center;
  gap: var(--m-3);
  max-width: min(420px, 100%);
  padding: var(--m-3) var(--m-4);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow);
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
  text-align: left;
  pointer-events: auto;
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .toast__item:hover {
    box-shadow: var(--m-shadow-lg);
  }
}

.toast__item:active {
  transform: translate(3px, 3px);
  box-shadow: var(--m-shadow-xs);
}

.toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-cyan);
  color: var(--m-ink);
}

.toast__item--success .toast__icon {
  background-color: var(--m-green);
}

.toast__item--error .toast__icon {
  background-color: var(--m-red);
}

.toast__text {
  word-break: break-word;
}
</style>
