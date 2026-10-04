/**
 * AppIcon：几何线性图标集。
 * 全部用 SVG 路径描述，替代 emoji，保证跨平台渲染一致、可跟随文字颜色。
 */
<script setup lang="ts">
import { computed } from 'vue';
import type { IconName } from './types';

/** 单条路径 */
interface IconPath {
  /** path 的 d 属性 */
  d: string;
  /** 是否填充（默认只描边） */
  fill?: boolean;
}

/** 圆形图元 */
interface IconCircle {
  /** 圆心 x */
  cx: number;
  /** 圆心 y */
  cy: number;
  /** 半径 */
  r: number;
  /** 是否填充 */
  fill?: boolean;
}

/** 图标定义 */
interface IconDef {
  /** 路径集合 */
  paths?: IconPath[];
  /** 圆形集合 */
  circles?: IconCircle[];
}

/** 全部图标（24×24 网格，2.4 描边，直角几何感） */
const ICONS: Record<IconName, IconDef> = {
  // 衣架：衣柜
  hanger: {
    paths: [
      { d: 'M12 8.6V7.4a2.2 2.2 0 1 1 2.2-2.2' },
      { d: 'M3.6 17.4 12 9.4l8.4 8z' }
    ]
  },
  // 心形
  heart: {
    paths: [
      {
        d: 'M12 19.6C10.6 18.4 4.6 14.3 4.6 10.4A4 4 0 0 1 12 7.9a4 4 0 0 1 7.4 2.5c0 3.9-6 8-7.4 9.2z'
      }
    ]
  },
  // 叠层：搭配
  layers: {
    paths: [{ d: 'M3.8 9.6 12 4.2l8.2 5.4-8.2 5.4z' }, { d: 'M3.8 14.6 12 20l8.2-5.4' }]
  },
  // 日历：日记
  calendar: {
    paths: [
      { d: 'M4 6.4h16v13.2H4z' },
      { d: 'M4 11h16' },
      { d: 'M8.4 3.6v3.4' },
      { d: 'M15.6 3.6v3.4' }
    ]
  },
  // 滑杆：设置
  sliders: {
    paths: [
      { d: 'M3.6 7.2h16.8' },
      { d: 'M3.6 16.8h16.8' },
      { d: 'M9.4 4.2v6' },
      { d: 'M15.4 13.8v6' }
    ]
  },
  plus: {
    paths: [{ d: 'M12 4.6v14.8' }, { d: 'M4.6 12h14.8' }]
  },
  close: {
    paths: [{ d: 'M5.8 5.8 18.2 18.2' }, { d: 'M18.2 5.8 5.8 18.2' }]
  },
  'chevron-left': {
    paths: [{ d: 'M15 4.6 7.6 12l7.4 7.4' }]
  },
  'chevron-down': {
    paths: [{ d: 'M4.8 9 12 16.2 19.2 9' }]
  },
  'chevron-right': {
    paths: [{ d: 'M9 4.6 16.4 12 9 19.4' }]
  },
  trash: {
    paths: [
      { d: 'M3.8 6.8h16.4' },
      { d: 'M9.2 6.8V3.8h5.6v3' },
      { d: 'M6.2 6.8 7.4 20.2h9.2l1.2-13.4' },
      { d: 'M10.2 10.4v6' },
      { d: 'M13.8 10.4v6' }
    ]
  },
  pencil: {
    paths: [{ d: 'M3.8 20.2l1-4.2L16.4 4.4l3.4 3.4L8.2 19.4z' }, { d: 'M14.6 6.2 17.8 9.6' }]
  },
  image: {
    paths: [
      { d: 'M4 5h16v14H4z' },
      { d: 'M4 15.6 9 10.6l3.6 3.6 3.4-3.4L20 15.2' }
    ],
    circles: [{ cx: 15.6, cy: 9, r: 1.4 }]
  },
  tag: {
    paths: [{ d: 'M11.4 3.8H4v7.4l8.8 8.8 7.4-7.4z' }],
    circles: [{ cx: 7.6, cy: 7.4, r: 1.3 }]
  },
  search: {
    paths: [{ d: 'M15.4 15.4 20.2 20.2' }],
    circles: [{ cx: 10.8, cy: 10.8, r: 6.4 }]
  },
  'arrow-up': {
    paths: [{ d: 'M12 19.4V4.8' }, { d: 'M5.6 11.2 12 4.8l6.4 6.4' }]
  },
  'arrow-down': {
    paths: [{ d: 'M12 4.6v14.6' }, { d: 'M5.6 12.8 12 19.2l6.4-6.4' }]
  },
  download: {
    paths: [{ d: 'M12 3.8v10.4' }, { d: 'M7.6 10 12 14.4 16.4 10' }, { d: 'M3.8 19.6h16.4' }]
  },
  upload: {
    paths: [{ d: 'M12 15.4V5' }, { d: 'M7.6 9.4 12 5l4.4 4.4' }, { d: 'M3.8 19.6h16.4' }]
  },
  check: {
    paths: [{ d: 'M4.6 12.8 9.6 17.8 19.4 6.6' }]
  },
  alert: {
    paths: [{ d: 'M12 4.4v9.2' }],
    circles: [{ cx: 12, cy: 18.4, r: 1.4, fill: true }]
  },
  star: {
    paths: [
      {
        d: 'M12 3.8l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6L3.2 10.2l6.1-.8z'
      }
    ]
  },
  grid: {
    paths: [
      { d: 'M4 4h6.4v6.4H4z' },
      { d: 'M13.6 4H20v6.4h-6.4z' },
      { d: 'M4 13.6h6.4V20H4z' },
      { d: 'M13.6 13.6H20V20h-6.4z' }
    ]
  }
};

const props = withDefaults(
  defineProps<{
    /** 图标名 */
    name: IconName;
    /** 渲染尺寸（宽高一致，单位 px） */
    size?: number;
    /** 描边宽度 */
    strokeWidth?: number;
    /** 是否填充（心形、星形用） */
    filled?: boolean;
  }>(),
  {
    size: 22,
    strokeWidth: 2.4,
    filled: false
  }
);

/** 当前图标定义 */
const icon = computed<IconDef>(() => ICONS[props.name]);
</script>

<template>
  <svg
    class="m-icon"
    :class="{ 'm-icon--filled': props.filled }"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(path, index) in icon.paths ?? []"
      :key="`p${index}`"
      :d="path.d"
      :fill="path.fill ? 'currentColor' : 'none'"
    />
    <circle
      v-for="(circle, index) in icon.circles ?? []"
      :key="`c${index}`"
      :cx="circle.cx"
      :cy="circle.cy"
      :r="circle.r"
      :fill="circle.fill ? 'currentColor' : 'none'"
    />
  </svg>
</template>

<style scoped>
.m-icon {
  display: block;
  flex: 0 0 auto;
}

.m-icon--filled :deep(path),
.m-icon--filled :deep(circle) {
  fill: currentColor;
}
</style>
