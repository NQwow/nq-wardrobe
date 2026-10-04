/**
 * Capacitor 打包配置。
 *
 * 应用完全离线运行：Web 资源（dist）会被打进 APK，WebView 通过本地 https 源加载，
 * 不需要任何域名或服务器。数据依旧存在设备本地的 IndexedDB 里。
 */
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  /** 应用包名，安装到手机后不可更改 */
  appId: 'com.nq.wardrobe',
  /** 桌面图标下的名字（编译期固定；应用内标题仍读 Setting 表的 appName） */
  appName: 'nq的衣柜',
  /** Vite 构建产物目录 */
  webDir: 'dist',
  android: {
    /** 允许 WebView 加载 http 资源（本项目用不到，保持关闭更安全） */
    allowMixedContent: false
  },
  server: {
    /** WebView 使用的本地协议源，决定 IndexedDB 的存储位置，不要随意改动 */
    androidScheme: 'https'
  }
};

export default config;
