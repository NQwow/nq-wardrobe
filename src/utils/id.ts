/**
 * id 与编号生成工具。
 */

/**
 * 生成全局唯一 id。优先使用 crypto.randomUUID()，
 * 在极老的 WebView 上退化为"时间戳 + 随机串"。
 * @returns 唯一 id 字符串
 */
export function createId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 衣服编号前缀 */
export const CLOTHING_CODE_PREFIX = 'NQ-';

/**
 * 根据序号生成衣服编号，如 1 → "NQ-0001"。
 * @param sequence 序号（从 1 开始）
 * @returns 形如 NQ-0001 的编号
 */
export function formatClothingCode(sequence: number): string {
  const safe = Number.isFinite(sequence) && sequence > 0 ? Math.floor(sequence) : 1;
  return `${CLOTHING_CODE_PREFIX}${String(safe).padStart(4, '0')}`;
}

/**
 * 从一批已有编号中解析出最大序号。
 * @param codes 已有编号数组，如 ["NQ-0001", "HOME-3"]
 * @returns 能解析出的最大序号，解析不到时返回 0
 */
export function parseMaxCodeSequence(codes: string[]): number {
  let max = 0;
  for (const code of codes) {
    const matched = /(\d+)\s*$/.exec(code.trim());
    if (!matched) continue;
    const value = Number.parseInt(matched[1], 10);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max;
}
