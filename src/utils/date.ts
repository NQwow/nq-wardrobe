/**
 * 时间格式化工具。所有时间戳统一为毫秒数。
 */

/** 一天的毫秒数 */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 把时间戳归零到当天 0 点。
 * @param timestamp 毫秒时间戳，缺省为当前时间
 * @returns 当天 0 点的毫秒时间戳
 */
export function startOfDay(timestamp: number = Date.now()): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * 格式化为 YYYY-MM-DD。
 * @param timestamp 毫秒时间戳
 * @returns 日期字符串，无效时间返回空串
 */
export function formatDate(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 格式化为 YYYY-MM-DD HH:mm。
 * @param timestamp 毫秒时间戳
 * @returns 日期时间字符串，无效时间返回空串
 */
export function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(timestamp)} ${hh}:${mm}`;
}

/**
 * 生成备份文件名用的时间片段，如 20250101-0930。
 * @param timestamp 毫秒时间戳，缺省为当前时间
 * @returns 形如 YYYYMMDD-HHmm 的字符串
 */
export function formatFileStamp(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}`;
}

/**
 * 相对时间描述，用于"最后穿着"展示。
 * @param timestamp 毫秒时间戳，未传时返回"从未"
 * @returns 如"从未"、"今天"、"3 天前"、"2024-05-01"
 */
export function formatRelativeDay(timestamp?: number): string {
  if (!timestamp) return '从未';
  const diffDays = Math.floor((startOfDay(Date.now()) - startOfDay(timestamp)) / ONE_DAY_MS);
  if (diffDays <= 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 30) return `${diffDays} 天前`;
  return formatDate(timestamp);
}

/**
 * 把时间戳转换为 `<input type="date">` 需要的值。
 * @param timestamp 毫秒时间戳
 * @returns YYYY-MM-DD
 */
export function toDateInputValue(timestamp: number): string {
  return formatDate(timestamp);
}

/**
 * 把 `<input type="date">` 的值转换为当天 0 点时间戳。
 * @param value YYYY-MM-DD
 * @returns 毫秒时间戳，解析失败返回当天 0 点
 */
export function fromDateInputValue(value: string): number {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return startOfDay();
  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
