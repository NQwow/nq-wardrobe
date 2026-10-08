/**
 * 设置（Setting）与应用级配置的数据模型，含 AI 预留配置。
 */

/** 主题模式 */
export type AppTheme = 'light' | 'dark' | 'auto';

/** 默认排序方式 */
export type SortKey =
  /** 最近添加 */
  | 'recent'
  /** 最近穿着 */
  | 'lastWorn'
  /** 穿着次数 */
  | 'wearCount'
  /** 名称 */
  | 'name'
  /** 编号 */
  | 'code'
  /** 手动（按 sortOrder / 创建顺序） */
  | 'manual';

/** 排序方式展示文案 */
export const SORT_KEY_LABEL: Record<SortKey, string> = {
  recent: '最近添加',
  lastWorn: '最近穿着',
  wearCount: '穿着次数',
  name: '名称',
  code: '编号',
  manual: '手动'
};

/** 设置项：key-value 结构，value 为任意可结构化克隆的值 */
export interface Setting {
  /** 设置键名 */
  key: string;
  /**
   * 设置值。IndexedDB 可存储结构化克隆支持的值，
   * 因此这里用 unknown，由 settingsService 按 key 收窄类型。
   */
  value: unknown;
}

/** AI 服务商 */
export type AiProvider = 'deepseek' | 'qwen' | 'zhipu' | 'doubao' | 'custom';

/** AI 配置（存在 Setting 表中，key 前缀 ai.） */
export interface AiConfig {
  /** 是否启用 AI 能力 */
  enabled: boolean;
  /** 服务商 */
  provider: AiProvider;
  /** 接口地址，如 https://api.deepseek.com/v1 */
  baseUrl: string;
  /** API Key（仅本地保存） */
  apiKey: string;
  /** 模型名，如 deepseek-chat */
  model: string;
}

/** 服务商预设：Base URL 与常用模型，供设置页自动填充 */
export interface AiProviderPreset {
  /** 服务商标识 */
  provider: AiProvider;
  /** 展示名 */
  label: string;
  /** 默认 Base URL */
  baseUrl: string;
  /** 默认文本模型 */
  model: string;
  /** 识图模型（无则留空） */
  visionModel?: string;
}

/** 全部服务商预设 */
export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  {
    provider: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    visionModel: 'qwen-vl-max'
  },
  {
    provider: 'zhipu',
    label: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    visionModel: 'glm-4v'
  },
  {
    provider: 'doubao',
    label: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: ''
  },
  {
    provider: 'custom',
    label: '自定义',
    baseUrl: '',
    model: ''
  }
];

/** Setting 表中的键名常量，避免散落的字符串字面量 */
export const SETTING_KEYS = {
  /** 应用名 */
  appName: 'appName',
  /** 主题 */
  theme: 'theme',
  /** 默认衣柜 id */
  defaultWardrobeId: 'defaultWardrobeId',
  /** 默认排序 */
  defaultSort: 'defaultSort',
  /** 是否已完成首次 seed */
  seeded: 'seeded',
  /** AI 开关 */
  aiEnabled: 'ai.enabled',
  /** AI 服务商 */
  aiProvider: 'ai.provider',
  /** AI Base URL */
  aiBaseUrl: 'ai.baseUrl',
  /** AI API Key */
  aiApiKey: 'ai.apiKey',
  /** AI 模型名 */
  aiModel: 'ai.model'
} as const;

/** 默认应用名 */
export const DEFAULT_APP_NAME = 'nq的衣柜';

/**
 * 应用版本号（「关于」分组与桌面端侧栏页脚共用，避免两处写不一样的数）。
 * 发版时同步修改：这里、package.json、android/app/build.gradle 的 versionName / versionCode。
 */
export const APP_VERSION = '0.3.0';

/** 默认 AI 配置 */
export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: false,
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat'
};

/** 备份文件结构（导出 / 导入共用） */
export interface BackupFile {
  /** 备份格式版本，导入时校验 */
  version: number;
  /** 导出时间（毫秒时间戳） */
  exportedAt: number;
  /** 导出时的应用名 */
  appName: string;
  /** 各表数据 */
  data: BackupData;
}

/** 备份中的图片：Blob 转 Base64 dataUrl 存储 */
export interface BackupImage {
  /** 图片 id */
  id: string;
  /** 所属衣服 id */
  clothingId: string;
  /** 原图 dataUrl */
  dataUrl: string;
  /** 缩略图 dataUrl */
  thumbnailUrl: string;
  /** 原图宽度 */
  width: number;
  /** 原图高度 */
  height: number;
  /** 排序序号 */
  sortOrder: number;
  /** 是否主图 */
  isMain: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 备份数据体（不含 Blob 字段，图片单独转 Base64） */
export interface BackupData {
  /** 衣柜列表 */
  wardrobes: unknown[];
  /** 衣服列表 */
  clothes: unknown[];
  /** 图片列表（Base64） */
  images: BackupImage[];
  /** 标签列表 */
  tags: unknown[];
  /** 衣服标签关联 */
  clothingTags: unknown[];
  /** 搭配列表 */
  outfits: unknown[];
  /** 搭配项 */
  outfitItems: unknown[];
  /** 日记 */
  diaries: unknown[];
  /** 穿着记录 */
  wearRecords: unknown[];
  /** 设置 */
  settings: unknown[];
}
