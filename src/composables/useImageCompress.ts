/**
 * 图片压缩组合式函数：把用户选择的图片压缩成原图 + 缩略图。
 */
import { drawToBlob, loadImage, readFileAsDataUrl } from '@/utils/blob';

/** 原图长边最大像素 */
export const MAX_IMAGE_SIZE = 1280;
/** 缩略图长边最大像素 */
export const MAX_THUMBNAIL_SIZE = 320;
/** 原图 JPEG 质量 */
export const IMAGE_QUALITY = 0.82;
/** 缩略图 JPEG 质量 */
export const THUMBNAIL_QUALITY = 0.7;

/** 压缩结果 */
export interface CompressedImage {
  /** 压缩后的原图 */
  blob: Blob;
  /** 列表用缩略图 */
  thumbnail: Blob;
  /** 原图宽度 */
  width: number;
  /** 原图高度 */
  height: number;
}

/**
 * 压缩单张图片：先生成原图，再生成缩略图。
 * @param file 用户选择的图片文件
 * @returns 压缩结果（原图 + 缩略图 + 尺寸）
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }
  const dataUrl = await readFileAsDataUrl(file);
  const { image, width, height } = await loadImage(dataUrl);
  const main = await drawToBlob(image, width, height, MAX_IMAGE_SIZE, IMAGE_QUALITY);
  const thumb = await drawToBlob(image, width, height, MAX_THUMBNAIL_SIZE, THUMBNAIL_QUALITY);
  return { blob: main.blob, thumbnail: thumb.blob, width: main.width, height: main.height };
}

/**
 * 图片压缩组合式函数。
 * @returns 压缩方法
 */
export function useImageCompress() {
  return { compressImage };
}
