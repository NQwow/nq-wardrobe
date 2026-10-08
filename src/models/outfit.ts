/**
 * 搭配（Outfit）与搭配项（OutfitItem）数据模型。
 * 第一阶段只建立模型与空壳服务，页面在第二阶段实现。
 */

/** 搭配槽位 */
export type OutfitSlot =
  /** 上装 */
  | 'top'
  /** 下装 */
  | 'bottom'
  /** 连衣裙 */
  | 'dress'
  /** 外套 */
  | 'outerwear'
  /** 鞋 */
  | 'shoes'
  /** 包 */
  | 'bag'
  /** 饰品 */
  | 'accessory'
  /** 其他 */
  | 'other';

/** 槽位展示文案 */
export const OUTFIT_SLOT_LABEL: Record<OutfitSlot, string> = {
  top: '上装',
  bottom: '下装',
  dress: '连衣裙',
  outerwear: '外套',
  shoes: '鞋',
  bag: '包',
  accessory: '饰品',
  other: '其他'
};

/** 全部槽位，顺序即画布展示顺序 */
export const OUTFIT_SLOTS: OutfitSlot[] = [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'bag',
  'accessory',
  'other'
];

/**
 * 槽位对应的一级品类标签名，用于搭配素材区按槽位筛选衣服。
 * 空数组表示不做限制（「其他」槽位可以放任何东西）。
 */
export const OUTFIT_SLOT_CATEGORY: Record<OutfitSlot, string[]> = {
  top: ['上装'],
  bottom: ['下装'],
  dress: ['连衣裙'],
  outerwear: ['外套'],
  shoes: ['鞋'],
  bag: ['包'],
  accessory: ['饰品'],
  other: []
};

/** 搭配 */
export interface Outfit {
  /** 主键 */
  id: string;
  /** 搭配名 */
  name: string;
  /** 封面图 id（可选，默认取第一件衣服的主图） */
  coverImageId?: string;
  /** 备注 */
  note?: string;
  /** 是否收藏 */
  favorite: boolean;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 软删除时间 */
  deletedAt?: number;
}

/** 搭配项：一个搭配由若干"槽位 → 衣服"组成 */
export interface OutfitItem {
  /** 主键 */
  id: string;
  /** 所属搭配 id */
  outfitId: string;
  /** 衣服 id */
  clothingId: string;
  /** 槽位 */
  slot: OutfitSlot;
  /** 同槽位多件时的排序序号 */
  sortOrder: number;
}
