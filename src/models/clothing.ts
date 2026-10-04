/**
 * 衣服、衣服图片、衣服与标签关联的数据模型。
 */

/** 衣服状态：正常 / 待清洗（后续可扩展 washing | idle | donated | lost） */
export type ClothingStatus = 'normal' | 'to_wash';

/** 状态展示文案，UI 与筛选条共用 */
export const CLOTHING_STATUS_LABEL: Record<ClothingStatus, string> = {
  normal: '正常',
  to_wash: '待清洗'
};

/** 衣服 */
export interface Clothing {
  /** 主键 */
  id: string;
  /** 编号，如 "NQ-0001"，可手改，全局唯一 */
  code: string;
  /** 名字 */
  name: string;
  /** 所属衣柜 id（单衣柜） */
  wardrobeId: string;
  /** 状态 */
  status: ClothingStatus;
  /** 是否收藏 */
  favorite: boolean;
  /** 备注 */
  note?: string;
  /** 主图 id（指向 ClothingImage.id） */
  mainImageId?: string;
  /** 穿着次数（日记自动累加，也可手动调整） */
  wearCount: number;
  /** 最后穿着时间（毫秒时间戳） */
  lastWornAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 软删除时间 */
  deletedAt?: number;
}

/** 衣服图片：图片不放进 Clothing，单独表存储，删除衣服时级联删图 */
export interface ClothingImage {
  /** 主键 */
  id: string;
  /** 所属衣服 id */
  clothingId: string;
  /** 压缩后的原图 Blob */
  blob: Blob;
  /** 缩略图 Blob（列表展示用） */
  thumbnail: Blob;
  /** 原图宽度（像素） */
  width: number;
  /** 原图高度（像素） */
  height: number;
  /** 排序序号，决定轮播顺序 */
  sortOrder: number;
  /** 是否主图 */
  isMain: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 衣服与标签的关联（多对多） */
export interface ClothingTag {
  /** 主键 */
  id: string;
  /** 衣服 id */
  clothingId: string;
  /** 标签 id */
  tagId: string;
}

/** 新增/编辑衣服时提交给 service 的表单数据 */
export interface ClothingFormData {
  /** 编号（留空表示由 service 自动生成） */
  code: string;
  /** 名字（必填） */
  name: string;
  /** 所属衣柜 id（必填） */
  wardrobeId: string;
  /** 状态 */
  status: ClothingStatus;
  /** 是否收藏 */
  favorite: boolean;
  /** 备注 */
  note: string;
  /** 选中的标签 id 列表 */
  tagIds: string[];
  /**
   * 待新增的图片（新增模式全部为待新增；编辑模式下仅新加的图片）
   * 已存在的图片由 service 通过 keepImageIds 判断保留
   */
  newImages: File[];
  /** 编辑模式下需要保留的已有图片 id（按展示顺序） */
  keepImageIds: string[];
  /** 主图 id（已有图片）或新图下标字符串，未指定时取第一张 */
  mainImageKey?: string;
}
