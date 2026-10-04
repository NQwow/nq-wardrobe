/**
 * AppModal：孟菲斯弹窗容器。
 * 支持居中、底部抽屉、右侧抽屉三种位置；手机端右侧抽屉自动降级为底部抽屉。
 */
<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import type { GeoColor, ModalPosition } from './types';

const props = withDefaults(
  defineProps<{
    /** 是否显示（v-model） */
    modelValue: boolean;
    /** 标题 */
    title?: string;
    /** 标题下方的一句说明 */
    subtitle?: string;
    /** 展示位置 */
    position?: ModalPosition;
    /** 顶部撞色条的颜色 */
    tone?: GeoColor;
    /** 是否显示右上角关闭按钮 */
    showClose?: boolean;
    /** 点击遮罩是否关闭 */
    maskClosable?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    position: 'center',
    tone: 'cyan',
    showClose: true,
    maskClosable: true
  }
);

const emit = defineEmits<{
  /** 显隐变化 */
  (event: 'update:modelValue', value: boolean): void;
  /** 关闭（遮罩 / 关闭按钮 / Esc） */
  (event: 'close'): void;
}>();

/** 面板引用，用于打开时聚焦 */
const panelRef = ref<HTMLElement | null>(null);

/** 关闭弹窗前记录的原滚动位置，用于恢复 */
let prevOverflow = '';

/**
 * 关闭弹窗并通知父组件。
 */
function close(): void {
  emit('update:modelValue', false);
  emit('close');
}

/**
 * 遮罩点击处理。
 */
function handleMask(): void {
  if (props.maskClosable) close();
}

/**
 * 键盘 Esc 关闭。
 * @param event 键盘事件
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

// 显示时禁止背景滚动并把焦点移入面板，隐藏时恢复
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeydown);
      requestAnimationFrame(() => panelRef.value?.focus());
    } else {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeydown);
    }
  }
);

onUnmounted(() => {
  document.body.style.overflow = prevOverflow;
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="m-fade">
      <div v-if="props.modelValue" class="modal" @click.self="handleMask">
        <div
          ref="panelRef"
          class="modal__panel"
          :class="`modal__panel--${props.position}`"
          role="dialog"
          aria-modal="true"
          :aria-label="props.title || undefined"
          tabindex="-1"
        >
          <span class="modal__tone" :class="`modal__tone--${props.tone}`" aria-hidden="true" />

          <header v-if="props.title || props.showClose" class="modal__head">
            <div class="modal__titles">
              <h2 v-if="props.title" class="m-h2 modal__title">{{ props.title }}</h2>
              <p v-if="props.subtitle" class="m-caption">{{ props.subtitle }}</p>
            </div>
            <button v-if="props.showClose" class="modal__close" type="button" aria-label="关闭" @click="close">
              <AppIcon name="close" :size="18" :stroke-width="3" />
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  background-color: var(--m-scrim);
}

.modal__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--m-surface);
  border: var(--m-line);
  border-radius: var(--m-radius);
  box-shadow: var(--m-shadow-lg);
}

.modal__panel:focus {
  outline: none;
}

/* 顶部撞色条：孟菲斯的彩色分区 */
.modal__tone {
  display: block;
  height: 14px;
  border-bottom: var(--m-line);
  flex: 0 0 auto;
}

.modal__tone--red {
  background-color: var(--m-red);
}

.modal__tone--yellow {
  background-color: var(--m-yellow);
}

.modal__tone--cyan {
  background-color: var(--m-cyan);
}

.modal__tone--pink {
  background-color: var(--m-pink);
}

.modal__tone--green {
  background-color: var(--m-green);
}

.modal__tone--ink {
  background-color: var(--m-ink);
}

/* --- 居中 --- */

.modal__panel--center {
  align-self: center;
  margin: 0 auto;
  width: min(520px, calc(100% - var(--m-4) * 2));
  max-height: min(84vh, 84dvh);
}

/* --- 底部抽屉 --- */

.modal__panel--bottom {
  align-self: flex-end;
  width: 100%;
  max-height: min(88vh, 88dvh);
  margin-bottom: calc(var(--m-safe-b) * -1 + var(--m-safe-b));
  border-bottom: none;
}

/* --- 右侧抽屉：手机端降级为底部抽屉 --- */

.modal__panel--side {
  align-self: flex-end;
  width: 100%;
  max-height: min(88vh, 88dvh);
  border-bottom: none;
}

@media (min-width: 700px) {
  .modal__panel--bottom {
    width: min(680px, calc(100% - var(--m-8) * 2));
    margin: 0 auto var(--m-6);
    border-bottom: var(--m-line);
  }

  .modal__panel--side {
    align-self: stretch;
    margin-left: auto;
    width: min(480px, 100%);
    height: 100%;
    max-height: 100%;
    border-top: none;
    border-right: none;
    border-bottom: none;
  }

  .modal__panel--side .modal__tone {
    border-bottom: var(--m-line);
  }
}

/* --- 头部 --- */

.modal__head {
  display: flex;
  align-items: flex-start;
  gap: var(--m-3);
  padding: var(--m-5) var(--m-5) var(--m-4);
  border-bottom: var(--m-line);
}

.modal__titles {
  flex: 1;
  min-width: 0;
}

.modal__title {
  word-break: break-word;
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .modal__close:hover {
    background-color: var(--m-red);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.modal__close:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

/* --- 主体 --- */

.modal__body {
  flex: 1;
  min-height: 0;
  padding: var(--m-5);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* --- 底部操作区 --- */

.modal__foot {
  display: flex;
  gap: var(--m-3);
  padding: var(--m-4) var(--m-5) calc(var(--m-4) + var(--m-safe-b));
  border-top: var(--m-line);
  background-color: var(--m-surface);
}

.modal__foot :deep(> *) {
  flex: 1;
}

@media (min-width: 700px) {
  .modal__foot {
    padding-bottom: var(--m-4);
    justify-content: flex-end;
  }

  .modal__foot :deep(> *) {
    flex: 0 0 auto;
    min-width: 120px;
  }
}
</style>
