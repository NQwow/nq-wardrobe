/**
 * Blob / File 相关工具：Blob ↔ URL、Blob ↔ Base64、文件下载。
 */

/**
 * 把 Blob 转为 Base64 dataUrl（备份导出使用）。
 * @param blob 待转换的 Blob
 * @returns dataUrl 字符串
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 把 Base64 dataUrl 转回 Blob（备份导入使用）。
 * @param dataUrl data:image/...;base64,xxx
 * @returns Blob 对象
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('备份中的图片解析失败');
  }
  return await response.blob();
}

/**
 * 为 Blob 创建对象 URL，使用方必须在组件卸载时 revokeObjectUrl 释放。
 * @param blob 图片 Blob
 * @returns objectURL
 */
export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * 释放对象 URL，避免内存泄漏。
 * @param url createObjectUrl 产生的地址，空值直接忽略
 */
export function revokeObjectUrl(url?: string): void {
  if (url) URL.revokeObjectURL(url);
}

/**
 * 触发浏览器下载。
 * @param blob 文件内容
 * @param filename 保存的文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = createObjectUrl(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // 立即释放会导致部分浏览器下载中断，延后释放
  window.setTimeout(() => revokeObjectUrl(url), 2000);
}

/**
 * 下载 JSON 文本文件。
 * @param data 任意可序列化对象
 * @param filename 保存的文件名
 */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * 读取用户选择的文件为文本（备份导入使用）。
 * @param file 用户选择的文件
 * @returns 文件文本内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 读取用户选择的文件为 dataUrl（图片上传使用）。
 * @param file 用户选择的文件
 * @returns dataUrl 字符串
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 通过 Image 元素加载 dataUrl，拿到真实像素尺寸。
 * @param dataUrl 图片 dataUrl
 * @returns 图片元素与宽高
 */
export function loadImage(dataUrl: string): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = dataUrl;
  });
}

/**
 * 用 canvas 把图片绘制到指定最大边长的画布上并导出 Blob。
 * @param source 图片来源（Image / Canvas）
 * @param sourceWidth 源宽度
 * @param sourceHeight 源高度
 * @param maxSize 长边最大像素
 * @param quality JPEG 质量 0~1
 * @returns 压缩后的 Blob 与尺寸
 */
export async function drawToBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxSize: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前环境不支持 Canvas，无法压缩图片');
  }
  context.drawImage(source, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
  });
  if (!blob) {
    throw new Error('图片压缩失败');
  }
  return { blob, width, height };
}
