/**
 * 表单校验工具：返回错误信息，通过时返回 null。
 */

/**
 * 必填校验。
 * @param value 待校验字符串
 * @param label 字段中文名，用于拼错误提示
 * @returns 错误信息或 null
 */
export function validateRequired(value: string, label: string): string | null {
  if (!value || !value.trim()) return `请填写${label}`;
  return null;
}

/**
 * 最大长度校验。
 * @param value 待校验字符串
 * @param max 最大长度
 * @param label 字段中文名
 * @returns 错误信息或 null
 */
export function validateMaxLength(value: string, max: number, label: string): string | null {
  if (value.length > max) return `${label}不能超过 ${max} 个字符`;
  return null;
}

/**
 * 编号重复校验。
 * @param code 待校验编号
 * @param existingCodes 已存在的编号集合（不含自身）
 * @returns 错误信息或 null
 */
export function validateUniqueCode(code: string, existingCodes: string[]): string | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  const duplicated = existingCodes.some((item) => item.trim().toLowerCase() === normalized);
  return duplicated ? '该编号已存在，请换一个' : null;
}

/**
 * 衣柜名校验（新增/重命名共用）。
 * @param name 衣柜名
 * @param existingNames 已存在的衣柜名（不含自身）
 * @returns 错误信息或 null
 */
export function validateWardrobeName(name: string, existingNames: string[]): string | null {
  const required = validateRequired(name, '衣柜名');
  if (required) return required;
  const trimmed = name.trim();
  if (trimmed.length > 12) return '衣柜名不能超过 12 个字符';
  if (existingNames.some((item) => item.trim() === trimmed)) return '已存在同名衣柜';
  return null;
}

/**
 * 标签名校验（新增/重命名共用）。
 * @param name 标签名
 * @param existingNames 同类型下已存在的标签名（不含自身）
 * @returns 错误信息或 null
 */
export function validateTagName(name: string, existingNames: string[]): string | null {
  const required = validateRequired(name, '标签名');
  if (required) return required;
  const trimmed = name.trim();
  if (trimmed.length > 8) return '标签名不能超过 8 个字符';
  if (existingNames.some((item) => item.trim() === trimmed)) return '同类型下已存在同名标签';
  return null;
}

/**
 * 校验 16 进制颜色值。
 * @param color 颜色字符串
 * @returns 是否为合法 #RRGGBB
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(color.trim());
}
