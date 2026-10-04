/**
 * 衣服业务逻辑：CRUD、编号生成与唯一性、状态与收藏切换、
 * 软删除与级联清理（图片 / 标签关联 / 穿着记录 / 搭配项）。
 */
import { clothingRepo, diaryRepo, imageRepo, outfitRepo, tagRepo, wardrobeRepo } from '@/repositories';
import { imageService } from './imageService';
import { createId, formatClothingCode, parseMaxCodeSequence } from '@/utils/id';
import { validateMaxLength, validateRequired, validateUniqueCode } from '@/utils/validate';
import type {
  Clothing,
  ClothingFormData,
  ClothingImage,
  ClothingStatus,
  Tag,
  Wardrobe
} from '@/models';

/** 衣柜列表用的衣服条目：衣服 + 关联展示信息 */
export interface ClothingListItem {
  /** 衣服本体 */
  clothing: Clothing;
  /** 所属衣柜名（衣柜缺失时为空串） */
  wardrobeName: string;
  /** 所属衣柜图标 */
  wardrobeIcon?: string;
  /** 已关联标签 id */
  tagIds: string[];
  /** 已关联标签名（用于搜索与卡片展示） */
  tagNames: string[];
  /** 主图缩略图 objectURL */
  thumbnailUrl?: string;
}

/** 衣服详情：衣服 + 图片 + 标签 + 衣柜 */
export interface ClothingDetail {
  /** 衣服本体 */
  clothing: Clothing;
  /** 图片列表（按 sortOrder 升序） */
  images: ClothingImage[];
  /** 已关联标签 */
  tags: Tag[];
  /** 所属衣柜 */
  wardrobe?: Wardrobe;
}

export const clothingService = {
  /**
   * 查询全部未删除衣服。
   * @returns 衣服列表
   */
  async list(): Promise<Clothing[]> {
    return clothingRepo.list();
  },

  /**
   * 查询全部未删除衣服，并补齐衣柜名、标签、主图缩略图。
   * @returns 列表条目数组
   */
  async listItems(): Promise<ClothingListItem[]> {
    const [clothes, wardrobes, tags] = await Promise.all([
      clothingRepo.list(),
      wardrobeRepo.list(),
      tagRepo.list()
    ]);

    const wardrobeMap = new Map(wardrobes.map((item) => [item.id, item]));
    const tagMap = new Map(tags.map((item) => [item.id, item]));

    const relations = await clothingRepo.listRelationsByClothes(clothes.map((item) => item.id));
    const relationsByClothing = new Map<string, string[]>();
    for (const relation of relations) {
      const list = relationsByClothing.get(relation.clothingId) ?? [];
      list.push(relation.tagId);
      relationsByClothing.set(relation.clothingId, list);
    }

    const mainImageIds = clothes.map((item) => item.mainImageId ?? '').filter(Boolean);
    const thumbnails = await imageService.resolveThumbnails(mainImageIds);

    return clothes.map((clothing) => {
      const wardrobe = wardrobeMap.get(clothing.wardrobeId);
      const tagIds = relationsByClothing.get(clothing.id) ?? [];
      return {
        clothing,
        wardrobeName: wardrobe?.name ?? '',
        wardrobeIcon: wardrobe?.icon,
        tagIds,
        tagNames: tagIds.map((tagId) => tagMap.get(tagId)?.name ?? '').filter(Boolean),
        thumbnailUrl: clothing.mainImageId ? thumbnails[clothing.mainImageId] : undefined
      };
    });
  },

  /**
   * 按 id 查询衣服。
   * @param id 衣服 id
   * @returns 衣服或 undefined
   */
  async getById(id: string): Promise<Clothing | undefined> {
    return clothingRepo.getById(id);
  },

  /**
   * 查询衣服详情。
   * @param id 衣服 id
   * @returns 详情对象；衣服不存在时返回 undefined
   */
  async getDetail(id: string): Promise<ClothingDetail | undefined> {
    const clothing = await clothingRepo.getById(id);
    if (!clothing) return undefined;

    const [images, relations, wardrobe] = await Promise.all([
      imageRepo.listByClothing(id),
      clothingRepo.listRelationsByClothing(id),
      wardrobeRepo.getById(clothing.wardrobeId)
    ]);
    const tags = await tagRepo.listByIds(relations.map((item) => item.tagId));

    return { clothing, images, tags, wardrobe };
  },

  /**
   * 生成下一个可用编号，如 NQ-0001。
   * @returns 编号字符串
   */
  async generateCode(): Promise<string> {
    const codes = await clothingRepo.listCodes();
    return formatClothingCode(parseMaxCodeSequence(codes) + 1);
  },

  /**
   * 校验表单基础字段。
   * @param form 表单数据
   * @param excludeId 编辑时排除自身 id
   * @throws 校验不通过时抛出错误
   */
  async validateForm(form: ClothingFormData, excludeId?: string): Promise<void> {
    const nameError = validateRequired(form.name, '名字') ?? validateMaxLength(form.name.trim(), 30, '名字');
    if (nameError) throw new Error(nameError);
    if (!form.wardrobeId) throw new Error('请选择所属衣柜');

    const wardrobe = await wardrobeRepo.getById(form.wardrobeId);
    if (!wardrobe || wardrobe.deletedAt) throw new Error('所选衣柜不存在');

    if (form.code.trim()) {
      const all = await clothingRepo.listCodes();
      const others = excludeId
        ? (await clothingRepo.list()).filter((item) => item.id !== excludeId).map((item) => item.code)
        : all;
      const codeError = validateUniqueCode(form.code, others);
      if (codeError) throw new Error(codeError);
    }
  },

  /**
   * 新增衣服：写衣服、存图片、写标签关联。
   * @param form 表单数据
   * @returns 创建后的衣服
   * @throws 校验失败或未上传图片时抛出错误
   */
  async create(form: ClothingFormData): Promise<Clothing> {
    if (!form.newImages.length) throw new Error('请至少上传一张图片');
    await this.validateForm(form);

    const now = Date.now();
    const code = form.code.trim() || (await this.generateCode());
    const clothing: Clothing = {
      id: createId(),
      code,
      name: form.name.trim(),
      wardrobeId: form.wardrobeId,
      status: form.status,
      favorite: form.favorite,
      note: form.note.trim() || undefined,
      wearCount: 0,
      createdAt: now,
      updatedAt: now
    };
    await clothingRepo.put(clothing);

    const images = await imageService.saveImages(clothing.id, form.newImages);
    const mainImage = images[0];
    if (mainImage) {
      await imageService.reorder(
        images.map((item) => item.id),
        mainImage.id
      );
      clothing.mainImageId = mainImage.id;
      await clothingRepo.put(clothing);
    }

    await this.replaceTags(clothing.id, form.tagIds);
    return clothing;
  },

  /**
   * 更新衣服：更新字段、增删图片、重写标签关联。
   * @param id 衣服 id
   * @param form 表单数据
   * @returns 更新后的衣服
   * @throws 衣服不存在、校验失败或改后无图片时抛出错误
   */
  async update(id: string, form: ClothingFormData): Promise<Clothing> {
    const current = await clothingRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('衣服不存在或已被删除');
    await this.validateForm(form, id);

    const existingImages = await imageRepo.listByClothing(id);
    const keepSet = new Set(form.keepImageIds);
    const removed = existingImages.filter((item) => !keepSet.has(item.id));

    if (!form.keepImageIds.length && !form.newImages.length) {
      throw new Error('请至少保留或上传一张图片');
    }

    if (removed.length) {
      await imageService.removeMany(removed.map((item) => item.id));
    }

    const keptOrdered = form.keepImageIds
      .map((imageId) => existingImages.find((item) => item.id === imageId))
      .filter((item): item is ClothingImage => Boolean(item));

    const added = await imageService.saveImages(id, form.newImages, keptOrdered.length);
    const orderedIds = [...keptOrdered.map((item) => item.id), ...added.map((item) => item.id)];

    const mainImageId =
      form.mainImageKey && orderedIds.includes(form.mainImageKey) ? form.mainImageKey : orderedIds[0];
    await imageService.reorder(orderedIds, mainImageId);

    const next: Clothing = {
      ...current,
      code: form.code.trim() || current.code,
      name: form.name.trim(),
      wardrobeId: form.wardrobeId,
      status: form.status,
      favorite: form.favorite,
      note: form.note.trim() || undefined,
      mainImageId,
      updatedAt: Date.now()
    };
    await clothingRepo.put(next);
    await this.replaceTags(id, form.tagIds);
    return next;
  },

  /**
   * 重写某件衣服的标签关联。
   * @param clothingId 衣服 id
   * @param tagIds 目标标签 id 列表
   */
  async replaceTags(clothingId: string, tagIds: string[]): Promise<void> {
    await clothingRepo.removeRelationsByClothing(clothingId);
    const unique = Array.from(new Set(tagIds.filter(Boolean)));
    if (!unique.length) return;
    await clothingRepo.bulkPutRelations(
      unique.map((tagId) => ({ id: createId(), clothingId, tagId }))
    );
  },

  /**
   * 切换收藏状态。
   * @param id 衣服 id
   * @returns 切换后的收藏状态
   * @throws 衣服不存在时抛出错误
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const current = await clothingRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('衣服不存在或已被删除');
    const favorite = !current.favorite;
    await clothingRepo.update(id, { favorite, updatedAt: Date.now() });
    return favorite;
  },

  /**
   * 切换状态（正常 / 待清洗）。
   * @param id 衣服 id
   * @param status 目标状态；不传时在两种状态间切换
   * @returns 切换后的状态
   * @throws 衣服不存在时抛出错误
   */
  async setStatus(id: string, status?: ClothingStatus): Promise<ClothingStatus> {
    const current = await clothingRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('衣服不存在或已被删除');
    const next: ClothingStatus = status ?? (current.status === 'normal' ? 'to_wash' : 'normal');
    await clothingRepo.update(id, { status: next, updatedAt: Date.now() });
    return next;
  },

  /**
   * 把衣服迁移到另一个衣柜。
   * @param id 衣服 id
   * @param wardrobeId 目标衣柜 id
   * @throws 衣服或衣柜不存在时抛出错误
   */
  async moveToWardrobe(id: string, wardrobeId: string): Promise<void> {
    const current = await clothingRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('衣服不存在或已被删除');
    const wardrobe = await wardrobeRepo.getById(wardrobeId);
    if (!wardrobe || wardrobe.deletedAt) throw new Error('目标衣柜不存在');
    await clothingRepo.update(id, { wardrobeId, updatedAt: Date.now() });
  },

  /**
   * 软删除衣服，并级联清理图片、标签关联、穿着记录与搭配项。
   * @param id 衣服 id
   * @throws 衣服不存在时抛出错误
   */
  async remove(id: string): Promise<void> {
    const current = await clothingRepo.getById(id);
    if (!current || current.deletedAt) throw new Error('衣服不存在或已被删除');

    await clothingRepo.update(id, { deletedAt: Date.now() });
    await imageService.removeByClothing(id);
    await clothingRepo.removeRelationsByClothing(id);
    await diaryRepo.removeWearRecordsByClothing(id);
    await outfitRepo.removeItemsByClothing(id);
  },

  /**
   * 统计各衣柜衣服数量。
   * @returns 衣柜 id → 数量 的映射
   */
  async countByWardrobe(): Promise<Record<string, number>> {
    const clothes = await clothingRepo.list();
    const result: Record<string, number> = {};
    for (const item of clothes) {
      result[item.wardrobeId] = (result[item.wardrobeId] ?? 0) + 1;
    }
    return result;
  },

  /**
   * 统计未删除衣服总数。
   * @returns 数量
   */
  async count(): Promise<number> {
    const clothes = await clothingRepo.list();
    return clothes.length;
  }
};
