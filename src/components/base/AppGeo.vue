/**
 * AppGeo：孟菲斯几何装饰。
 * 放在 .m-card 里时，hover 会按 orbit 指定的方向各自漂移或旋转（Playful Chaos）。
 * 位置用预设的角位类表达，不使用内联样式。
 */
<script setup lang="ts">
import { computed } from 'vue';
import type { GeoColor, GeoCorner, GeoOrbit, GeoShape, GeoSize } from './types';

const props = withDefaults(
  defineProps<{
    /** 形状 */
    shape: GeoShape;
    /** 撞色，留空时按形状取默认色，便于一张卡片里自动错开 */
    color?: GeoColor;
    /** 尺寸 */
    size?: GeoSize;
    /** 漂移方向，0 表示静止 */
    orbit?: GeoOrbit;
    /** 在定位容器中的角位；不传表示普通流式元素 */
    at?: GeoCorner;
  }>(),
  {
    color: undefined,
    size: 'md',
    orbit: 0,
    at: undefined
  }
);

/** 形状的默认撞色 */
const DEFAULT_COLOR: Record<GeoShape, GeoColor> = {
  circle: 'red',
  ring: 'cyan',
  square: 'yellow',
  diamond: 'pink',
  triangle: 'green',
  half: 'red',
  cross: 'cyan'
};

/** 最终使用的撞色 */
const tone = computed<GeoColor>(() => props.color ?? DEFAULT_COLOR[props.shape]);
</script>

<template>
  <span
    class="m-geo"
    :class="[
      `m-geo--${props.shape}`,
      `m-geo--c-${tone}`,
      `m-geo--${props.size}`,
      props.orbit ? `m-geo--orbit-${props.orbit}` : '',
      props.at ? `m-geo--at-${props.at}` : ''
    ]"
  />
</template>
