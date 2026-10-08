/**
 * PageHeader：固定顶部页头。
 * 粗黑下描边 + 硬阴影，左侧撞色方块做视觉锚点；桌面端自动避开左侧导航栅。
 */
<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppIcon from '@/components/base/AppIcon.vue';
import type { GeoColor } from '@/components/base/types';

const props = withDefaults(
  defineProps<{
    /** 标题 */
    title: string;
    /** 是否显示返回按钮 */
    back?: boolean;
    /** 副标题（小字） */
    subtitle?: string;
    /** 标题前的撞色方块颜色 */
    tone?: GeoColor;
  }>(),
  {
    back: false,
    subtitle: '',
    tone: 'red'
  }
);

const emit = defineEmits<{
  /** 点击返回（默认行为是路由回退） */
  (event: 'back'): void;
}>();

const router = useRouter();

/**
 * 返回处理：先通知父组件，再执行浏览器回退；
 * 若无历史记录（例如直接从外部链接进入）则回到衣柜首页。
 */
function handleBack(): void {
  emit('back');
  if (window.history.length > 1) router.back();
  else void router.push({ name: 'wardrobe' });
}
</script>

<template>
  <header class="head">
    <div class="head__inner">
      <button v-if="props.back" class="head__back" type="button" aria-label="返回" @click="handleBack">
        <AppIcon name="chevron-left" :size="20" :stroke-width="3" />
      </button>

      <span class="head__mark" :class="`head__mark--${props.tone}`" aria-hidden="true" />

      <div class="head__titles">
        <h1 class="m-h2 head__title ellipsis">{{ props.title }}</h1>
        <p v-if="props.subtitle" class="head__subtitle ellipsis">{{ props.subtitle }}</p>
      </div>

      <div class="head__actions">
        <slot />
      </div>
    </div>
  </header>
</template>

<style scoped>
.head {
  position: fixed;
  top: 0;
  left: var(--m-rail);
  right: 0;
  z-index: 200;
  height: calc(var(--m-header-h) + var(--m-safe-t));
  padding-top: var(--m-safe-t);
  background-color: var(--m-surface);
  /* 用外框专用分隔线色：深色模式下不会变成一条米白横线 */
  border-bottom: var(--m-bw) solid var(--m-chrome-line);
  box-shadow: 0 4px 0 0 var(--m-chrome-line);
  transition: left var(--m-dur) var(--m-ease);
}

.head__inner {
  display: flex;
  align-items: center;
  gap: var(--m-3);
  height: var(--m-header-h);
  width: 100%;
  max-width: var(--m-container);
  margin: 0 auto;
  padding: 0 var(--m-4);
}

@media (min-width: 700px) {
  .head__inner {
    padding: 0 var(--m-7);
  }
}

@media (min-width: 1024px) {
  .head__inner {
    padding: 0 var(--m-8);
  }
}

.head__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .head__back:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.head__back:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.head__mark {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  border: 2.5px solid var(--m-line-color);
  background-color: var(--m-red);
}

.head__mark--red {
  background-color: var(--m-red);
}

.head__mark--yellow {
  background-color: var(--m-yellow);
}

.head__mark--cyan {
  background-color: var(--m-cyan);
}

.head__mark--pink {
  background-color: var(--m-pink);
}

.head__mark--green {
  background-color: var(--m-green);
}

.head__mark--ink {
  background-color: var(--m-text);
}

.head__titles {
  flex: 1;
  min-width: 0;
}

.head__title {
  font-weight: var(--m-weight-black);
}

.head__subtitle {
  font-size: var(--m-fs-xs);
  color: var(--m-text-muted);
  font-weight: var(--m-weight-body);
}

.head__actions {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  flex-shrink: 0;
}
</style>
