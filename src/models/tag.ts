/**
 * 标签（Tag）数据模型：预设标签 + 用户自定义标签，支持一级/二级分类。
 */

/** 标签类型 */
export type TagType =
  /** 品类（支持一级/二级，如 上装 > 短袖） */
  | 'category'
  /** 季节 */
  | 'season'
  /** 颜色 */
  | 'color'
  /** 风格 */
  | 'style'
  /** 场合 */
  | 'occasion'
  /** 材质 */
  | 'material'
  /** 自定义 */
  | 'custom';

/** 标签类型展示文案（顺序即 UI 分组顺序） */
export const TAG_TYPE_LABEL: Record<TagType, string> = {
  category: '品类',
  season: '季节',
  color: '颜色',
  style: '风格',
  occasion: '场合',
  material: '材质',
  custom: '自定义'
};

/** 全部标签类型，供遍历渲染使用 */
export const TAG_TYPES: TagType[] = [
  'category',
  'season',
  'color',
  'style',
  'occasion',
  'material',
  'custom'
];

/** 标签 */
export interface Tag {
  /** 主键 */
  id: string;
  /** 标签名 */
  name: string;
  /** 标签类型 */
  type: TagType;
  /** 父标签 id，用于一级/二级，如"短袖"的父级是"上装" */
  parentId?: string;
  /** 展示颜色（颜色类标签用于渲染色块） */
  color?: string;
  /** 排序序号 */
  sortOrder: number;
  /** 是否预设标签（预设标签不可删除，只能隐藏——隐藏功能第一版不做） */
  isPreset: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 标签树节点：一级标签挂载二级子标签，供标签选择器渲染 */
export interface TagTreeNode {
  /** 一级标签 */
  tag: Tag;
  /** 二级标签列表（无子标签时为空数组） */
  children: Tag[];
}
