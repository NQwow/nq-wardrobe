/**
 * AppConfirm：全局二次确认弹窗，状态来自 useConfirm。
 * 所有删除类操作都必须经过它。
 */
<script setup lang="ts">
import AppGeo from './AppGeo.vue';
import { useConfirm } from '@/composables/useConfirm';

const { state, accept, cancel } = useConfirm();
</script>

<template>
  <Teleport to="body">
    <Transition name="m-fade">
      <div v-if="state.visible" class="confirm" @click.self="cancel">
        <div
          class="confirm__panel"
          role="alertdialog"
          aria-modal="true"
          :aria-label="state.title"
        >
          <div class="confirm__art" aria-hidden="true">
            <AppGeo shape="circle" color="yellow" size="lg" />
            <AppGeo class="confirm__art-square" shape="square" color="cyan" size="md" />
            <AppGeo class="confirm__art-tri" shape="triangle" color="pink" size="md" />
          </div>

          <h2 class="m-h2 confirm__title">{{ state.title }}</h2>
          <p class="confirm__message">{{ state.message }}</p>

          <div class="confirm__actions">
            <button class="m-btn m-btn--outline m-btn--cyan" type="button" @click="cancel">
              {{ state.cancelText }}
            </button>
            <button
              class="m-btn"
              :class="state.danger ? 'm-btn--red' : 'm-btn--green'"
              type="button"
              @click="accept"
            >
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--m-4);
  background-color: var(--m-scrim);
}

.confirm__panel {
  position: relative;
  width: min(400px, 100%);
  padding: var(--m-6) var(--m-5) var(--m-5);
  background-color: var(--m-surface);
  border: var(--m-line);
  box-shadow: var(--m-shadow-lg);
  text-align: center;
}

/* 顶部几何装饰：确认框也要有孟菲斯的游乐场感 */
.confirm__art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m-3);
  height: 44px;
  margin-bottom: var(--m-4);
}

.confirm__art-square {
  transform: rotate(45deg);
}

.confirm__title {
  word-break: break-word;
}

.confirm__message {
  margin-top: var(--m-3);
  font-size: var(--m-fs-body);
  color: var(--m-text-soft);
  line-height: 1.7;
}

.confirm__actions {
  display: flex;
  gap: var(--m-3);
  margin-top: var(--m-6);
}

.confirm__actions > * {
  flex: 1;
}
</style>
