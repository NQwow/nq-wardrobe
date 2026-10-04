/**
 * Dexie 数据库实例与版本升级定义（版本 1）。
 * 只有 repositories 层可以直接引用本文件。
 */
import Dexie, { type Table } from 'dexie';
import type {
  Wardrobe,
  Clothing,
  ClothingImage,
  Tag,
  ClothingTag,
  Outfit,
  OutfitItem,
  DiaryEntry,
  WearRecord,
  Setting
} from '@/models';

/** 数据库名，改动会导致用户数据"丢失"，不要随意修改 */
export const DB_NAME = 'nq-wardrobe';

/** 当前数据库结构版本，与 this.version(n) 对应 */
export const DB_VERSION = 1;

/** 衣柜管理数据库 */
export class WardrobeDB extends Dexie {
  /** 衣柜表 */
  wardrobes!: Table<Wardrobe, string>;
  /** 衣服表 */
  clothes!: Table<Clothing, string>;
  /** 衣服图片表 */
  images!: Table<ClothingImage, string>;
  /** 标签表 */
  tags!: Table<Tag, string>;
  /** 衣服标签关联表 */
  clothingTags!: Table<ClothingTag, string>;
  /** 搭配表 */
  outfits!: Table<Outfit, string>;
  /** 搭配项表 */
  outfitItems!: Table<OutfitItem, string>;
  /** 日记表 */
  diaries!: Table<DiaryEntry, string>;
  /** 穿着记录表 */
  wearRecords!: Table<WearRecord, string>;
  /** 设置表 */
  settings!: Table<Setting, string>;

  constructor() {
    super(DB_NAME);
    // 版本号升级时新增表或索引；已有版本的定义必须保留
    this.version(DB_VERSION).stores({
      wardrobes: 'id, sortOrder, deletedAt',
      clothes: 'id, wardrobeId, code, favorite, status, lastWornAt, createdAt, deletedAt',
      images: 'id, clothingId, isMain',
      tags: 'id, type, parentId, sortOrder',
      clothingTags: 'id, clothingId, tagId, [clothingId+tagId]',
      outfits: 'id, favorite, createdAt, deletedAt',
      outfitItems: 'id, outfitId, clothingId, slot',
      diaries: 'id, date, outfitId',
      wearRecords: 'id, clothingId, date',
      settings: 'key'
    });
  }
}

/** 全局唯一数据库实例 */
export const db = new WardrobeDB();
