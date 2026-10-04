/**
 * AI 服务（预留）：拍照识别衣服信息、参数化推荐搭配。
 *
 * 第三阶段实现。所有 provider 都兼容 OpenAI Chat Completions 协议，
 * 因此只需要一套请求代码；Capacitor 环境下改用 CapacitorHttp 规避 CORS。
 */
import type { AiConfig, OutfitSlot } from '@/models';

/** 识别结果 */
export interface RecognizeResult {
  /** 识别出的名字 */
  name: string;
  /** 品类（如"上装"） */
  category: string;
  /** 颜色 */
  color: string;
  /** 适用季节 */
  season: string[];
  /** 风格 */
  style?: string;
  /** 备注 */
  note?: string;
}

/** 推荐参数 */
export interface RecommendParams {
  /** 场合 */
  occasion?: string;
  /** 天气 */
  weather?: string;
  /** 风格 */
  style?: string;
  /** 补充说明 */
  note?: string;
}

/** 推荐结果 */
export interface RecommendResult {
  /** 搭配名 */
  outfitName: string;
  /** 组成该搭配的衣服与槽位 */
  items: { clothingId: string; slot: OutfitSlot }[];
  /** 推荐理由 */
  reason: string;
}

/** 连接测试结果 */
export interface TestConnectionResult {
  /** 是否连通 */
  ok: boolean;
  /** 提示信息 */
  message: string;
}

/**
 * 拼接请求地址，避免出现重复斜杠。
 * @param baseUrl 服务商 Base URL
 * @param path 接口路径，如 /chat/completions
 * @returns 完整 URL
 */
function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export const aiService = {
  /**
   * 拍照识别衣服信息。
   * TODO(第三阶段)：把图片转 Base64，调用支持识图的模型（qwen-vl-max / glm-4v），
   * 让模型返回 JSON，再解析成 RecognizeResult。
   * @param _image 衣服图片
   * @returns 识别结果
   */
  async recognizeClothing(_image: Blob): Promise<RecognizeResult> {
    throw new Error('AI 识别尚未实现（第三阶段）');
  },

  /**
   * 参数化推荐搭配。
   * TODO(第三阶段)：把候选衣服列表与参数拼成提示词，让模型返回 outfitName/items/reason。
   * @param _params 推荐参数
   * @returns 推荐结果
   */
  async recommendOutfits(_params: RecommendParams): Promise<RecommendResult> {
    throw new Error('AI 推荐尚未实现（第三阶段）');
  },

  /**
   * 测试 AI 连接是否可用（设置页"测试连接"按钮）。
   * @param config AI 配置
   * @returns 测试结果
   */
  async testConnection(config: AiConfig): Promise<TestConnectionResult> {
    if (!config.baseUrl.trim()) return { ok: false, message: '请先填写 Base URL' };
    if (!config.apiKey.trim()) return { ok: false, message: '请先填写 API Key' };
    if (!config.model.trim()) return { ok: false, message: '请先填写模型名' };

    try {
      const response = await fetch(joinUrl(config.baseUrl, '/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: config.model.trim(),
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          stream: false
        })
      });

      if (response.ok) return { ok: true, message: '连接成功' };

      const text = await response.text();
      let detail = text.slice(0, 120);
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        detail = parsed.error?.message ?? detail;
      } catch {
        // 保留原始文本片段即可
      }
      return { ok: false, message: `连接失败（${response.status}）：${detail}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      return { ok: false, message: `请求失败：${message}（浏览器调试时可能是 CORS 限制）` };
    }
  }
};
