/**
 * 二次确认弹窗组合式函数：模块级单例状态，供 AppConfirm 组件渲染。
 * 所有删除类操作都必须经过它。
 */
import { readonly, ref } from 'vue';

/** 确认弹窗配置 */
export interface ConfirmOptions {
  /** 标题 */
  title?: string;
  /** 正文说明 */
  message: string;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 是否为危险操作（确认按钮用红色） */
  danger?: boolean;
}

/** 弹窗内部状态 */
interface ConfirmState extends ConfirmOptions {
  /** 是否正在展示 */
  visible: boolean;
}

/** 默认状态 */
const state = ref<ConfirmState>({
  visible: false,
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false
});

/** 当前等待中的 resolve，关闭时调用 */
let resolver: ((value: boolean) => void) | null = null;

/**
 * 关闭弹窗并返回用户选择。
 * @param result 用户点击了确认（true）还是取消（false）
 */
function settle(result: boolean): void {
  state.value = { ...state.value, visible: false };
  const current = resolver;
  resolver = null;
  if (current) current(result);
}

/**
 * 二次确认组合式函数。
 * @returns 状态与操作方法
 */
export function useConfirm() {
  return {
    /** 只读弹窗状态 */
    state: readonly(state),

    /**
     * 打开确认弹窗。
     * @param options 弹窗配置
     * @returns 用户点击确认时 resolve(true)，取消时 resolve(false)
     */
    confirm(options: ConfirmOptions): Promise<boolean> {
      // 上一个弹窗未关闭时视为取消，避免 Promise 悬挂
      if (resolver) settle(false);
      state.value = {
        visible: true,
        title: options.title ?? '提示',
        message: options.message,
        confirmText: options.confirmText ?? '确定',
        cancelText: options.cancelText ?? '取消',
        danger: options.danger ?? false
      };
      return new Promise<boolean>((resolve) => {
        resolver = resolve;
      });
    },

    /** 用户点击确认 */
    accept(): void {
      settle(true);
    },

    /** 用户点击取消 / 遮罩 */
    cancel(): void {
      settle(false);
    }
  };
}
