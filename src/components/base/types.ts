/**
 * 基础组件与业务组件共用的类型定义
 * （`<script setup>` 内不允许 export，因此统一放在这里）。
 */
import type { WardrobeShape, WardrobeTone } from '@/models';

/** 按钮视觉类型 */
export type ButtonType = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';

/** 按钮尺寸 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** 按钮撞色（孟菲斯高饱和配色） */
export type ButtonTone = 'red' | 'yellow' | 'cyan' | 'pink' | 'green';

/** 下拉选项 */
export interface SelectOption {
  /** 选项值 */
  value: string;
  /** 选项文案 */
  label: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/** 标签页项 */
export interface TabItem {
  /** 唯一键 */
  key: string;
  /** 展示文案 */
  label: string;
  /** 角标数字，0 或未传时不显示 */
  badge?: number;
}

/** 弹窗展示位置 */
export type ModalPosition = 'center' | 'bottom' | 'side';

/* ------------------------------ 图标 ------------------------------ */

/** 图标名称（全部为几何风格的线性图标，不使用 emoji） */
export type IconName =
  | 'hanger'
  | 'heart'
  | 'layers'
  | 'calendar'
  | 'sliders'
  | 'plus'
  | 'close'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-right'
  | 'trash'
  | 'pencil'
  | 'image'
  | 'tag'
  | 'search'
  | 'arrow-up'
  | 'arrow-down'
  | 'download'
  | 'upload'
  | 'check'
  | 'alert'
  | 'star'
  | 'grid';

/* --------------------------- 几何装饰 --------------------------- */

/** 几何形状（孟菲斯的圆、方、三角、菱形等），与衣柜标识形状共用一套令牌 */
export type GeoShape = WardrobeShape;

/** 几何装饰的撞色 */
export type GeoColor = WardrobeTone;

/** 几何装饰尺寸 */
export type GeoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** 几何装饰的漂移方向（0 表示静止） */
export type GeoOrbit = 0 | 1 | 2 | 3 | 4 | 5;

/** 几何装饰在容器中的角位 */
export type GeoCorner = 'tl' | 'tr' | 'bl' | 'br';

/** 空状态插画主题（用几何图形拼合，不使用 emoji） */
export type EmptyMotif = 'hanger' | 'grid' | 'heart' | 'calendar' | 'layers' | 'tag';
