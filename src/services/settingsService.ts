/**
 * 设置业务逻辑：读写 Setting 表，暴露应用名、主题、默认排序与 AI 配置。
 * 本服务不操作 DOM，主题与标题的落地由 settingsStore 负责。
 */
import { settingRepo } from '@/repositories';
import { DEFAULT_AI_CONFIG, SETTING_KEYS, type AiConfig, type AppTheme, type SortKey } from '@/models';

/** 主题合法值集合，用于兜底校验 */
const THEMES: AppTheme[] = ['light', 'dark', 'auto'];

/** 排序合法值集合，用于兜底校验 */
const SORT_KEYS: SortKey[] = ['recent', 'lastWorn', 'wearCount', 'name', 'code', 'manual'];

export const settingsService = {
  /**
   * 读取字符串类设置。
   * @param key 设置键名
   * @param fallback 缺省值
   * @returns 字符串值
   */
  async getString(key: string, fallback = ''): Promise<string> {
    const row = await settingRepo.get(key);
    return typeof row?.value === 'string' ? row.value : fallback;
  },

  /**
   * 写入字符串类设置。
   * @param key 设置键名
   * @param value 字符串值
   */
  async setString(key: string, value: string): Promise<void> {
    await settingRepo.put(key, value);
  },

  /**
   * 读取应用名。
   * @param fallback 缺省应用名
   * @returns 应用名
   */
  async getAppName(fallback: string): Promise<string> {
    const value = await this.getString(SETTING_KEYS.appName, '');
    return value.trim() || fallback;
  },

  /**
   * 保存应用名。
   * @param name 应用名
   */
  async setAppName(name: string): Promise<void> {
    await settingRepo.put(SETTING_KEYS.appName, name.trim());
  },

  /**
   * 读取主题设置。
   * @returns 主题模式，非法值回退为 auto
   */
  async getTheme(): Promise<AppTheme> {
    const value = await this.getString(SETTING_KEYS.theme, 'auto');
    return THEMES.includes(value as AppTheme) ? (value as AppTheme) : 'auto';
  },

  /**
   * 保存主题设置。
   * @param theme 主题模式
   */
  async setTheme(theme: AppTheme): Promise<void> {
    await settingRepo.put(SETTING_KEYS.theme, theme);
  },

  /**
   * 读取默认排序方式。
   * @returns 排序键，非法值回退为 recent
   */
  async getDefaultSort(): Promise<SortKey> {
    const value = await this.getString(SETTING_KEYS.defaultSort, 'recent');
    return SORT_KEYS.includes(value as SortKey) ? (value as SortKey) : 'recent';
  },

  /**
   * 保存默认排序方式。
   * @param key 排序键
   */
  async setDefaultSort(key: SortKey): Promise<void> {
    await settingRepo.put(SETTING_KEYS.defaultSort, key);
  },

  /**
   * 读取默认衣柜 id。
   * @returns 衣柜 id，未设置时返回空串
   */
  async getDefaultWardrobeId(): Promise<string> {
    return this.getString(SETTING_KEYS.defaultWardrobeId, '');
  },

  /**
   * 保存默认衣柜 id。
   * @param wardrobeId 衣柜 id
   */
  async setDefaultWardrobeId(wardrobeId: string): Promise<void> {
    await settingRepo.put(SETTING_KEYS.defaultWardrobeId, wardrobeId);
  },

  /**
   * 读取 AI 配置（缺失字段用默认值补齐）。
   * @returns AI 配置
   */
  async getAiConfig(): Promise<AiConfig> {
    const [enabled, provider, baseUrl, apiKey, model] = await Promise.all([
      settingRepo.get(SETTING_KEYS.aiEnabled),
      settingRepo.get(SETTING_KEYS.aiProvider),
      settingRepo.get(SETTING_KEYS.aiBaseUrl),
      settingRepo.get(SETTING_KEYS.aiApiKey),
      settingRepo.get(SETTING_KEYS.aiModel)
    ]);
    return {
      enabled: typeof enabled?.value === 'boolean' ? enabled.value : DEFAULT_AI_CONFIG.enabled,
      provider: typeof provider?.value === 'string' ? (provider.value as AiConfig['provider']) : DEFAULT_AI_CONFIG.provider,
      baseUrl: typeof baseUrl?.value === 'string' ? baseUrl.value : DEFAULT_AI_CONFIG.baseUrl,
      apiKey: typeof apiKey?.value === 'string' ? apiKey.value : DEFAULT_AI_CONFIG.apiKey,
      model: typeof model?.value === 'string' ? model.value : DEFAULT_AI_CONFIG.model
    };
  },

  /**
   * 保存 AI 配置。
   * @param config AI 配置
   */
  async saveAiConfig(config: AiConfig): Promise<void> {
    await settingRepo.bulkPut([
      { key: SETTING_KEYS.aiEnabled, value: config.enabled },
      { key: SETTING_KEYS.aiProvider, value: config.provider },
      { key: SETTING_KEYS.aiBaseUrl, value: config.baseUrl },
      { key: SETTING_KEYS.aiApiKey, value: config.apiKey },
      { key: SETTING_KEYS.aiModel, value: config.model }
    ]);
  },

  /**
   * 读取全部设置项（备份导出使用）。
   * @returns 设置列表
   */
  async listAll() {
    return settingRepo.list();
  }
};
