/**
 * 设置 store：应用名、主题、默认排序、AI 配置。
 * 负责把主题与标题落到 DOM（service 层保持纯数据操作）。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { settingsService } from '@/services';
import { DEFAULT_AI_CONFIG, DEFAULT_APP_NAME, type AiConfig, type AppTheme, type SortKey } from '@/models';

export const useSettingsStore = defineStore('settings', () => {
  /** 应用名 */
  const appName = ref(DEFAULT_APP_NAME);
  /** 主题模式 */
  const theme = ref<AppTheme>('auto');
  /** 默认排序 */
  const defaultSort = ref<SortKey>('recent');
  /** AI 配置 */
  const aiConfig = ref<AiConfig>({ ...DEFAULT_AI_CONFIG });
  /** 是否已完成初始化 */
  const ready = ref(false);

  /** 当前实际是否为深色（auto 时跟随系统） */
  const isDark = computed(() => {
    if (theme.value === 'dark') return true;
    if (theme.value === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /**
   * 把主题写到 body class 上，CSS 变量据 body.theme-dark 覆盖。
   */
  function applyTheme(): void {
    document.body.classList.toggle('theme-dark', isDark.value);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark.value ? '#101010' : '#fef9ef');
  }

  /**
   * 把应用名同步到浏览器标题栏。
   */
  function applyTitle(): void {
    document.title = appName.value || DEFAULT_APP_NAME;
  }

  /**
   * 从数据库加载全部设置并应用到 DOM。
   */
  async function init(): Promise<void> {
    try {
      const [name, loadedTheme, sort, ai] = await Promise.all([
        settingsService.getAppName(DEFAULT_APP_NAME),
        settingsService.getTheme(),
        settingsService.getDefaultSort(),
        settingsService.getAiConfig()
      ]);
      appName.value = name;
      theme.value = loadedTheme;
      defaultSort.value = sort;
      aiConfig.value = ai;
      applyTheme();
      applyTitle();
      ready.value = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '设置读取失败';
      throw new Error(message);
    }
  }

  /**
   * 修改应用名并同步标题栏。
   * @param name 新的应用名
   */
  async function setAppName(name: string): Promise<void> {
    const next = name.trim() || DEFAULT_APP_NAME;
    await settingsService.setAppName(next);
    appName.value = next;
    applyTitle();
  }

  /**
   * 修改主题并立即生效。
   * @param next 主题模式
   */
  async function setTheme(next: AppTheme): Promise<void> {
    await settingsService.setTheme(next);
    theme.value = next;
    applyTheme();
  }

  /**
   * 修改默认排序方式。
   * @param key 排序键
   */
  async function setDefaultSort(key: SortKey): Promise<void> {
    await settingsService.setDefaultSort(key);
    defaultSort.value = key;
  }

  /**
   * 保存 AI 配置。
   * @param config AI 配置
   */
  async function saveAiConfig(config: AiConfig): Promise<void> {
    await settingsService.saveAiConfig(config);
    aiConfig.value = { ...config };
  }

  /**
   * 监听系统主题变化（auto 模式下实时响应）。
   * @returns 取消监听的函数
   */
  function watchSystemTheme(): () => void {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (): void => {
      if (theme.value === 'auto') applyTheme();
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }

  return {
    appName,
    theme,
    defaultSort,
    aiConfig,
    ready,
    isDark,
    applyTheme,
    init,
    setAppName,
    setTheme,
    setDefaultSort,
    saveAiConfig,
    watchSystemTheme
  };
});
