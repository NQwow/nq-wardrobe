/**
 * 衣柜（Wardrobe）数据模型：一件衣服只属于一个衣柜。
 * 衣柜的视觉标识由「几何形状 + 撞色」两个令牌组成，不使用 emoji。
 */

/** 衣柜标识形状（孟菲斯几何图形） */
export type WardrobeShape = 'circle' | 'ring' | 'square' | 'diamond' | 'triangle' | 'half' | 'cross';

/** 衣柜标识撞色 */
export type WardrobeTone = 'red' | 'yellow' | 'cyan' | 'pink' | 'green' | 'ink';

/** 全部可用形状（按此顺序在管理页展示） */
export const WARDROBE_SHAPES: WardrobeShape[] = [
  'circle',
  'ring',
  'square',
  'diamond',
  'triangle',
  'half',
  'cross'
];

/** 全部可用撞色 */
export const WARDROBE_TONES: WardrobeTone[] = ['red', 'yellow', 'cyan', 'pink', 'green', 'ink'];

/** 默认形状 */
export const DEFAULT_WARDROBE_SHAPE: WardrobeShape = 'circle';

/** 默认撞色 */
export const DEFAULT_WARDROBE_TONE: WardrobeTone = 'red';

/**
 * 判断任意字符串是否为合法形状令牌。
 * @param value 待判断的值
 * @returns 是否合法
 */
export function isWardrobeShape(value: unknown): value is WardrobeShape {
  return typeof value === 'string' && (WARDROBE_SHAPES as string[]).includes(value);
}

/**
 * 判断任意字符串是否为合法撞色令牌。
 * @param value 待判断的值
 * @returns 是否合法
 */
export function isWardrobeTone(value: unknown): value is WardrobeTone {
  return typeof value === 'string' && (WARDROBE_TONES as string[]).includes(value);
}

/** 衣柜 */
export interface Wardrobe {
  /** 主键，crypto.randomUUID() 生成 */
  id: string;
  /** 衣柜名，如"当季"、"老家" */
  name: string;
  /** 标识形状令牌（历史字段名沿用 icon，取值见 WardrobeShape） */
  icon?: string;
  /** 标识撞色（hex 或撞色令牌，建议使用 WardrobeTone） */
  color?: string;
  /** 排序序号，越小越靠前 */
  sortOrder: number;
  /** 创建时间（毫秒时间戳） */
  createdAt: number;
  /** 最后更新时间（毫秒时间戳） */
  updatedAt: number;
  /** 软删除时间，存在即视为已删除，查询默认过滤 */
  deletedAt?: number;
}

/** 新建衣柜时的入参（id 与时间戳由 service 生成） */
export type WardrobeDraft = Pick<Wardrobe, 'name'> &
  Partial<Pick<Wardrobe, 'icon' | 'color' | 'sortOrder'>>;
