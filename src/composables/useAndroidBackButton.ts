/**
 * 安卓实体返回键处理。
 *
 * 原生环境下接管返回键，让它在应用内逐级返回（详情 → 列表 → 首页），
 * 只有退到第一层时才真正退出应用；浏览器里不做任何事。
 */
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * 读取当前的路由历史位置。
 * vue-router 4 会把 position 写进 history.state，首页为 0，每 push 一次加一。
 * @returns 当前位置，取不到时返回 0
 */
function currentHistoryPosition(): number {
  const state = window.history.state as { position?: number } | null;
  return typeof state?.position === 'number' ? state.position : 0;
}

/**
 * 组合式函数：在组件挂载时注册返回键监听，卸载时移除。
 */
export function useAndroidBackButton(): void {
  const router = useRouter();
  let listener: PluginListenerHandle | null = null;

  onMounted(async () => {
    if (!Capacitor.isNativePlatform()) return;
    listener = await CapacitorApp.addListener('backButton', () => {
      if (currentHistoryPosition() > 0) {
        router.back();
      } else {
        void CapacitorApp.exitApp();
      }
    });
  });

  onUnmounted(() => {
    void listener?.remove();
    listener = null;
  });
}
