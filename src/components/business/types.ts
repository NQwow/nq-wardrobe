/**
 * 业务组件共用类型定义（`<script setup>` 内不允许 export，因此单独成文件）。
 */

/** 图片上传器状态 */
export interface ImageUploaderState {
  /** 已存在的图片（编辑模式），url 为可直接用于 img 的对象 URL */
  existing: ExistingImagePreview[];
  /** 本次新选择的文件 */
  files: File[];
  /** 主图标识：已有图片的 id，或 `new:<files 下标>`，留空表示取第一张 */
  mainKey?: string;
}

/** 已存在图片的预览信息 */
export interface ExistingImagePreview {
  /** 图片 id */
  id: string;
  /** 对象 URL（由调用方通过 imageService 解析并负责释放） */
  url: string;
}

/** 搭配槽位内展示的衣服信息 */
export interface OutfitSlotClothing {
  /** 衣服 id */
  id: string;
  /** 衣服名 */
  name: string;
  /** 缩略图 URL */
  thumbnailUrl?: string;
}
