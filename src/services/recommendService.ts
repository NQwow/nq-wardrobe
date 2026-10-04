/**
 * 规则推荐服务（不依赖 AI）：按季节、场合挑出一套"上装 + 下装 + 鞋"。
 *
 * 推荐规则：
 * 1. 过滤出当季标签的衣服
 * 2. 优先 lastWornAt 最久远的
 * 3. 优先 favorite = true
 * 4. 避免同色系冲突（简单版：上装与下装颜色不同）
 * 5. 组成一套：上装 + 下装 + 鞋
 */
import { clothingRepo, tagRepo } from '@/repositories';
import type { Clothing, OutfitSlot, Tag } from '@/models';

/** 推荐入参 */
export interface RuleRecommendParams {
  /** 季节标签名，如"夏" */
  season?: string;
  /** 场合标签名，如"通勤" */
  occasion?: string;
}

/** 单条推荐结果 */
export interface RuleRecommendItem {
  /** 衣服 id */
  clothingId: string;
  /** 槽位 */
  slot: OutfitSlot;
  /** 衣服名（便于直接展示） */
  name: string;
  /** 主图 id */
  mainImageId?: string;
}

/** 推荐结果 */
export interface RuleRecommendResult {
  /** 搭配名 */
  outfitName: string;
  /** 选中的衣服 */
  items: RuleRecommendItem[];
  /** 推荐理由 */
  reason: string;
}

/**
 * 计算排序权重：越久没穿、越常收藏，权重越高。
 * @param clothing 衣服
 * @returns 权重值（越大越优先）
 */
function score(clothing: Clothing): number {
  const daysSinceWorn = clothing.lastWornAt
    ? (Date.now() - clothing.lastWornAt) / (24 * 60 * 60 * 1000)
    : 365;
  return daysSinceWorn + (clothing.favorite ? 30 : 0) - clothing.wearCount * 0.5;
}

export const recommendService = {
  /**
   * 按规则推荐一套搭配。
   * @param params 季节与场合
   * @returns 推荐结果；候选不足时可能少于 3 件
   */
  async recommend(params: RuleRecommendParams): Promise<RuleRecommendResult> {
    const [clothes, tags] = await Promise.all([clothingRepo.list(), tagRepo.list()]);
    const relations = await clothingRepo.listRelationsByClothes(clothes.map((item) => item.id));

    const tagMap = new Map<string, Tag>(tags.map((item) => [item.id, item]));
    const tagsByClothing = new Map<string, Tag[]>();
    for (const relation of relations) {
      const tag = tagMap.get(relation.tagId);
      if (!tag) continue;
      const list = tagsByClothing.get(relation.clothingId) ?? [];
      list.push(tag);
      tagsByClothing.set(relation.clothingId, list);
    }

    const tagsOf = (clothingId: string): Tag[] => tagsByClothing.get(clothingId) ?? [];

    /** 判断衣服是否属于某个品类（含二级标签的父级） */
    const isCategory = (clothingId: string, rootNames: string[]): boolean =>
      tagsOf(clothingId).some((tag) => {
        if (tag.type !== 'category') return false;
        if (rootNames.includes(tag.name)) return true;
        const parent = tag.parentId ? tagMap.get(tag.parentId) : undefined;
        return parent ? rootNames.includes(parent.name) : false;
      });

    /** 取颜色标签名（找不到时返回空串） */
    const colorOf = (clothingId: string): string =>
      tagsOf(clothingId).find((tag) => tag.type === 'color')?.name ?? '';

    /** 是否命中季节或场合 */
    const matchesContext = (clothingId: string): boolean => {
      const list = tagsOf(clothingId);
      const seasonOk = !params.season || list.some((tag) => tag.type === 'season' && tag.name === params.season);
      const occasionOk =
        !params.occasion || list.some((tag) => tag.type === 'occasion' && tag.name === params.occasion);
      return seasonOk && occasionOk;
    };

    const pick = (rootNames: string[], excludeColor: string): Clothing | undefined => {
      const candidates = clothes
        .filter((item) => !item.deletedAt && isCategory(item.id, rootNames))
        .filter((item) => (params.season || params.occasion ? matchesContext(item.id) : true))
        .sort((a, b) => score(b) - score(a));

      return candidates.find((item) => colorOf(item.id) !== excludeColor) ?? candidates[0];
    };

    const top = pick(['上装', '连衣裙'], '');
    const bottom = pick(['下装'], top ? colorOf(top.id) : '');
    const shoes = pick(['鞋'], '');

    const items: RuleRecommendItem[] = [];
    const push = (clothing: Clothing | undefined, slot: OutfitSlot): void => {
      if (!clothing) return;
      items.push({
        clothingId: clothing.id,
        slot,
        name: clothing.name,
        mainImageId: clothing.mainImageId
      });
    };
    push(top, 'top');
    push(bottom, 'bottom');
    push(shoes, 'shoes');

    const reasonParts: string[] = [];
    if (params.season) reasonParts.push(`当季（${params.season}）`);
    if (params.occasion) reasonParts.push(`适合${params.occasion}`);
    reasonParts.push('优先挑选很久没穿的与收藏的衣服');

    return {
      outfitName: [params.season, params.occasion].filter(Boolean).join('·') || '规则推荐',
      items,
      reason: items.length ? reasonParts.join('，') : '没有找到符合条件的衣服，请先完善标签'
    };
  }
};
