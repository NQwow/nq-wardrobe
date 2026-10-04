/**
 * 图片业务逻辑：压缩、生成缩略图、保存 Blob、按 id 取 URL 并统一释放。
 * 对象 URL 在本模块集中缓存，避免页面反复创建导致内存泄漏。
 */
import { compressImage } from '@/composables/useImageCompress';
import { imageRepo } from '@/repositories';
import { createId } from '@/utils/id';
import { blobToDataUrl, createObjectUrl, revokeObjectUrl } from '@/utils/blob';
import type { ClothingImage } from '@/models';

/** URL 缓存的两种用途 */
export type ImageVariant = 'thumb' | 'full';

/** 缓存上限，超过后按插入顺序淘汰最旧的 URL */
const MAX_CACHED_URLS = 260;

/** imageId + 用途 → objectURL */
const urlCache = new Map<string, string>();

/**
 * 组装缓存键。
 * @param imageId 图片 id
 * @param variant 用途
 * @returns 缓存键
 */
function cacheKey(imageId: string, variant: ImageVariant): string {
  return `${variant}:${imageId}`;
}

/**
 * 淘汰超出上限的缓存并释放对象 URL。
 */
function evictIfNeeded(): void {
  while (urlCache.size > MAX_CACHED_URLS) {
    const oldestKey = urlCache.keys().next().value;
    if (oldestKey === undefined) break;
    revokeObjectUrl(urlCache.get(oldestKey));
    urlCache.delete(oldestKey);
  }
}

/**
 * 把 Blob 放入缓存。
 * @param key 缓存键
 * @param blob 图片数据
 * @returns objectURL
 */
function cacheBlob(key: string, blob: Blob): string {
  const cached = urlCache.get(key);
  if (cached) return cached;
  const url = createObjectUrl(blob);
  urlCache.set(key, url);
  evictIfNeeded();
  return url;
}

export const imageService = {
  /**
   * 查询某件衣服的全部图片。
   * @param clothingId 衣服 id
   * @returns 图片列表（按 sortOrder 升序）
   */
  async listByClothing(clothingId: string): Promise<ClothingImage[]> {
    return imageRepo.listByClothing(clothingId);
  },

  /**
   * 按 id 查询图片。
   * @param imageId 图片 id
   * @returns 图片或 undefined
   */
  async getById(imageId: string): Promise<ClothingImage | undefined> {
    return imageRepo.getById(imageId);
  },

  /**
   * 获取图片的对象 URL（带缓存）。
   * @param imageId 图片 id
   * @param variant 用途：缩略图或原图
   * @returns objectURL；图片不存在时返回 undefined
   */
  async getUrl(imageId: string, variant: ImageVariant = 'thumb'): Promise<string | undefined> {
    const key = cacheKey(imageId, variant);
    const cached = urlCache.get(key);
    if (cached) return cached;

    const image = await imageRepo.getById(imageId);
    if (!image) return undefined;
    return cacheBlob(key, variant === 'thumb' ? image.thumbnail : image.blob);
  },

  /**
   * 批量把"衣服 id → 主图 id"解析为缩略图 URL。
   * @param mainImageIds 主图 id 列表
   * @returns 图片 id → 缩略图 URL 的映射（无图时不含该键）
   */
  async resolveThumbnails(mainImageIds: string[]): Promise<Record<string, string>> {
    const unique = Array.from(new Set(mainImageIds.filter(Boolean)));
    const result: Record<string, string> = {};
    await Promise.all(
      unique.map(async (imageId) => {
        const url = await this.getUrl(imageId, 'thumb');
        if (url) result[imageId] = url;
      })
    );
    return result;
  },

  /**
   * 压缩并保存若干张新图片到指定衣服。
   * @param clothingId 衣服 id
   * @param files 用户选择的图片文件
   * @param startOrder 起始排序序号
   * @returns 保存后的图片记录数组
   * @throws 任一图片压缩失败时抛出错误
   */
  async saveImages(clothingId: string, files: File[], startOrder = 0): Promise<ClothingImage[]> {
    const saved: ClothingImage[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const compressed = await compressImage(files[index]);
      const record: ClothingImage = {
        id: createId(),
        clothingId,
        blob: compressed.blob,
        thumbnail: compressed.thumbnail,
        width: compressed.width,
        height: compressed.height,
        sortOrder: startOrder + index,
        isMain: false,
        createdAt: Date.now()
      };
      await imageRepo.put(record);
      saved.push(record);
    }
    return saved;
  },

  /**
   * 重排图片顺序并指定主图。
   * @param orderedIds 按展示顺序排列的图片 id
   * @param mainImageId 主图 id；未指定时取第一张
   */
  async reorder(orderedIds: string[], mainImageId?: string): Promise<void> {
    const mainId = mainImageId && orderedIds.includes(mainImageId) ? mainImageId : orderedIds[0];
    await Promise.all(
      orderedIds.map((id, index) => imageRepo.update(id, { sortOrder: index, isMain: id === mainId }))
    );
  },

  /**
   * 删除单张图片。
   * @param imageId 图片 id
   */
  async remove(imageId: string): Promise<void> {
    await imageRepo.remove(imageId);
    this.release(imageId);
  },

  /**
   * 批量删除图片。
   * @param imageIds 图片 id 数组
   */
  async removeMany(imageIds: string[]): Promise<void> {
    await imageRepo.removeMany(imageIds);
    for (const id of imageIds) this.release(id);
  },

  /**
   * 删除某件衣服的全部图片（衣服被删除时级联调用）。
   * @param clothingId 衣服 id
   */
  async removeByClothing(clothingId: string): Promise<void> {
    const images = await imageRepo.listByClothing(clothingId);
    for (const image of images) this.release(image.id);
    await imageRepo.removeByClothing(clothingId);
  },

  /**
   * 释放某张图片的对象 URL。
   * @param imageId 图片 id
   */
  release(imageId: string): void {
    for (const variant of ['thumb', 'full'] as ImageVariant[]) {
      const key = cacheKey(imageId, variant);
      const url = urlCache.get(key);
      if (url) {
        revokeObjectUrl(url);
        urlCache.delete(key);
      }
    }
  },

  /** 释放全部对象 URL（应用退出或数据清空时调用） */
  releaseAll(): void {
    for (const url of urlCache.values()) {
      revokeObjectUrl(url);
    }
    urlCache.clear();
  },

  /**
   * 把 Blob 直接转为 dataUrl（备份导出使用）。
   * @param blob 图片数据
   * @returns dataUrl
   */
  async toDataUrl(blob: Blob): Promise<string> {
    return blobToDataUrl(blob);
  }
};
