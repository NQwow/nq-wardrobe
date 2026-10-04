/**
 * 穿搭日记（DiaryEntry）与穿着记录（WearRecord）数据模型。
 * 第一阶段只建立模型与空壳服务，页面在第二阶段实现。
 */

/** 穿搭日记条目：一天一条，关联搭配或直接关联衣服 */
export interface DiaryEntry {
  /** 主键 */
  id: string;
  /** 当天 0 点时间戳（毫秒） */
  date: number;
  /** 关联的搭配 id（与 clothingIds 至少有一个非空） */
  outfitId?: string;
  /** 直接关联的衣服 id 列表（无搭配时使用） */
  clothingIds: string[];
  /** 天气，如"晴 18℃" */
  weather?: string;
  /** 场合，如"通勤" */
  occasion?: string;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/** 穿着记录：写入日记或手动标记时生成，用于统计与 wearCount 累加 */
export interface WearRecord {
  /** 主键 */
  id: string;
  /** 衣服 id */
  clothingId: string;
  /** 穿着日期（当天 0 点时间戳，毫秒） */
  date: number;
  /** 来源：日记自动 / 手动标记 */
  source: 'diary' | 'manual';
  /** 创建时间 */
  createdAt: number;
}
