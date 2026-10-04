/**
 * Toast 提示组合式函数：模块级单例状态，供 AppToast 组件渲染。
 */
import { readonly, ref } from 'vue';
import { createId } from '@/utils/id';

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'info';

/** 一条 Toast 记录 */
export interface ToastItem {
  /** 唯一 id，用于列表 key 与手动关闭 */
  id: string;
  /** 提示文案 */
  message: string;
  /** 提示类型，决定配色与图标 */
  type: ToastType;
}

/** 默认自动消失时长（毫秒） */
const DEFAULT_DURATION = 2200;

/** 当前展示中的 Toast 列表（模块级单例） */
const toasts = ref<ToastItem[]>([]);

/** 定时器表，便于手动关闭时清理 */
const timers = new Map<string, number>();

/**
 * 移除指定 Toast。
 * @param id Toast id
 */
function remove(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

/**
 * 弹出一条 Toast。
 * @param message 提示文案
 * @param type 提示类型，默认 info
 * @param duration 自动关闭时长（毫秒），传 0 表示不自动关闭
 */
function show(message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION): void {
  const id = createId();
  toasts.value = [...toasts.value, { id, message, type }];
  if (duration > 0) {
    timers.set(
      id,
      window.setTimeout(() => remove(id), duration)
    );
  }
}

/** 清空全部 Toast */
function clear(): void {
  for (const id of Array.from(timers.keys())) {
    window.clearTimeout(timers.get(id));
  }
  timers.clear();
  toasts.value = [];
}

/**
 * Toast 组合式函数。
 * @returns 只读列表与各类型快捷方法
 */
export function useToast() {
  return {
    /** 只读的 Toast 列表 */
    toasts: readonly(toasts),
    /** 手动关闭 */
    remove,
    /** 清空全部 */
    clear,
    /**
     * 通用提示
     * @param message 文案
     * @param duration 自动关闭时长（毫秒）
     */
    info(message: string, duration?: number) {
      show(message, 'info', duration);
    },
    /**
     * 成功提示
     * @param message 文案
     * @param duration 自动关闭时长（毫秒）
     */
    success(message: string, duration?: number) {
      show(message, 'success', duration);
    },
    /**
     * 失败提示，默认停留更久
     * @param message 文案
     * @param duration 自动关闭时长（毫秒）
     */
    error(message: string, duration: number = 3200) {
      show(message, 'error', duration);
    }
  };
}
