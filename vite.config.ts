/**
 * Vite 构建配置：注册 Vue 插件、配置 @ 路径别名与开发服务器。
 */
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // Capacitor 打包后使用 file:// 或本地服务器加载，必须用相对路径
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    // 移动端包体控制：提高告警阈值，避免开发期噪音
    chunkSizeWarningLimit: 1200
  }
});
