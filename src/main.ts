/**
 * 应用入口：加载全局样式、注册 Pinia 与路由，初始化数据库后挂载应用。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { seedIfNeeded } from './db/seed';
import { useToast } from './composables/useToast';
import './assets/styles/variables.css';
import './assets/styles/global.css';

/**
 * 启动应用：先完成首次数据初始化（预设标签 + 默认衣柜），再挂载界面。
 * 初始化失败不阻塞启动，改为挂载后弹出错误提示。
 */
async function bootstrap(): Promise<void> {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);

  let seedError = '';
  try {
    await seedIfNeeded();
  } catch (error) {
    seedError = error instanceof Error ? error.message : '未知错误';
  }

  await router.isReady();
  app.mount('#app');

  if (seedError) {
    useToast().error(`数据初始化失败：${seedError}`, 5000);
  }
}

void bootstrap();
