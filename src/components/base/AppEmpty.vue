/**
 * AppEmpty：空状态占位。
 * 用几何图形拼出插画（不使用 emoji），统一全站空态视觉。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppGeo from './AppGeo.vue';
import AppIcon from './AppIcon.vue';
import type { EmptyMotif, GeoColor, IconName } from './types';

const props = withDefaults(
  defineProps<{
    /** 插画主题（决定中央图标与撞色） */
    motif?: EmptyMotif;
    /** 主文案 */
    title?: string;
    /** 补充说明 */
    description?: string;
  }>(),
  {
    motif: 'hanger',
    title: '这里还是空的',
    description: ''
  }
);

/** 主题对应的图标与撞色 */
const MOTIF: Record<EmptyMotif, { icon: IconName; tone: GeoColor }> = {
  hanger: { icon: 'hanger', tone: 'red' },
  grid: { icon: 'grid', tone: 'cyan' },
  heart: { icon: 'heart', tone: 'pink' },
  calendar: { icon: 'calendar', tone: 'green' },
  layers: { icon: 'layers', tone: 'cyan' },
  tag: { icon: 'tag', tone: 'yellow' }
};

/** 当前主题配置 */
const current = computed(() => MOTIF[props.motif]);
</script>

<template>
  <div class="empty">
    <div class="empty__art" aria-hidden="true">
      <span class="empty__plate" :class="`empty__plate--${current.tone}`">
        <AppIcon :name="current.icon" :size="38" :stroke-width="2.2" />
      </span>
      <AppGeo class="empty__g1" shape="circle" color="yellow" size="sm" />
      <AppGeo class="empty__g2" shape="triangle" color="green" size="md" />
      <span class="empty__band m-zigzag" />
    </div>

    <p class="empty__title">{{ props.title }}</p>
    <p v-if="props.description" class="empty__desc">{{ props.description }}</p>

    <div v-if="$slots.default" class="empty__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--m-8) var(--m-4);
  text-align: center;
}

/* 插画：中央一块撞色底板 + 两个几何装饰 + 一条折线带 */
.empty__art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 116px;
}

.empty__plate {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border: var(--m-line);
  box-shadow: var(--m-shadow);
  color: var(--m-ink);
  transform: rotate(-4deg);
}

.empty__plate--red {
  background-color: var(--m-red);
}

.empty__plate--yellow {
  background-color: var(--m-yellow);
}

.empty__plate--cyan {
  background-color: var(--m-cyan);
}

.empty__plate--pink {
  background-color: var(--m-pink);
}

.empty__plate--green {
  background-color: var(--m-green);
}

.empty__plate--ink {
  background-color: var(--m-surface-2);
  color: var(--m-text);
}

.empty__g1 {
  position: absolute;
  top: 4px;
  right: 12px;
}

.empty__g2 {
  position: absolute;
  bottom: 16px;
  left: 8px;
}

.empty__band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 12px;
  color: var(--m-text-muted);
}

.empty__title {
  margin-top: var(--m-6);
  font-size: var(--m-fs-h3);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
  color: var(--m-text);
}

.empty__desc {
  margin-top: var(--m-2);
  max-width: 34ch;
  font-size: var(--m-fs-sm);
  color: var(--m-text-muted);
  line-height: 1.7;
}

.empty__action {
  margin-top: var(--m-5);
}
</style>
