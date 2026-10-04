/**
 * 备份业务逻辑：导出 JSON（图片转 Base64）、导入覆盖、清空数据。
 * 导入/清空在单个 Dexie 事务中执行，保证原子性。
 */
import { db } from '@/db';
import {
  clothingRepo,
  diaryRepo,
  imageRepo,
  outfitRepo,
  settingRepo,
  tagRepo,
  wardrobeRepo
} from '@/repositories';
import { imageService } from './imageService';
import { downloadJson, dataUrlToBlob, readFileAsText } from '@/utils/blob';
import { formatFileStamp } from '@/utils/date';
import { DEFAULT_APP_NAME, type BackupData, type BackupFile, type BackupImage } from '@/models';

/** 当前备份格式版本 */
export const BACKUP_VERSION = 1;

/** 导入结果 */
export interface ImportResult {
  /** 各表导入条数 */
  counts: Record<string, number>;
}

/**
 * 判断对象是否为可用的备份结构。
 * @param value 待校验的解析结果
 * @returns 是否为合法备份
 */
function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BackupFile>;
  return typeof candidate.version === 'number' && Boolean(candidate.data) && typeof candidate.data === 'object';
}

export const backupService = {
  /**
   * 组装备份对象（图片转为 Base64）。
   * @param appName 当前应用名
   * @returns 备份对象
   */
  async buildBackup(appName: string): Promise<BackupFile> {
    const [wardrobes, clothes, images, tags, clothingTags, outfits, outfitItems, diaries, wearRecords, settings] =
      await Promise.all([
        wardrobeRepo.listAll(),
        clothingRepo.listAll(),
        imageRepo.listAll(),
        tagRepo.list(),
        clothingRepo.listRelations(),
        outfitRepo.listAll(),
        outfitRepo.listAllItems(),
        diaryRepo.list(),
        diaryRepo.listWearRecords(),
        settingRepo.list()
      ]);

    const backupImages: BackupImage[] = [];
    for (const image of images) {
      backupImages.push({
        id: image.id,
        clothingId: image.clothingId,
        dataUrl: await imageService.toDataUrl(image.blob),
        thumbnailUrl: await imageService.toDataUrl(image.thumbnail),
        width: image.width,
        height: image.height,
        sortOrder: image.sortOrder,
        isMain: image.isMain,
        createdAt: image.createdAt
      });
    }

    const data: BackupData = {
      wardrobes,
      clothes,
      images: backupImages,
      tags,
      clothingTags,
      outfits,
      outfitItems,
      diaries,
      wearRecords,
      settings
    };

    return {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      appName: appName || DEFAULT_APP_NAME,
      data
    };
  },

  /**
   * 生成备份文件并触发下载，文件名形如 nq-wardrobe-backup-20250101-0930.json。
   * @param appName 当前应用名
   */
  async downloadBackup(appName: string): Promise<void> {
    const backup = await this.buildBackup(appName);
    downloadJson(backup, `nq-wardrobe-backup-${formatFileStamp()}.json`);
  },

  /**
   * 清空全部数据（含图片、设置）。
   * @param keepSeededFlag 是否保留"已完成初始化"标记，默认 false（清空后重新 seed）
   */
  async clearAll(keepSeededFlag = false): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.wardrobes,
        db.clothes,
        db.images,
        db.tags,
        db.clothingTags,
        db.outfits,
        db.outfitItems,
        db.diaries,
        db.wearRecords,
        db.settings
      ],
      async () => {
        await wardrobeRepo.clear();
        await clothingRepo.clear();
        await imageRepo.clear();
        await tagRepo.clear();
        await clothingRepo.clearRelations();
        await outfitRepo.clear();
        await outfitRepo.clearItems();
        await diaryRepo.clear();
        await diaryRepo.clearWearRecords();
        if (!keepSeededFlag) await settingRepo.clear();
      }
    );
    imageService.releaseAll();
  },

  /**
   * 读取用户选择的备份文件文本并导入（覆盖现有数据）。
   * @param file 用户选择的 JSON 文件
   * @returns 导入统计
   * @throws 文件损坏或版本不兼容时抛出错误
   */
  async importFromFile(file: File): Promise<ImportResult> {
    const text = await readFileAsText(file);
    return this.importFromText(text);
  },

  /**
   * 从 JSON 文本导入备份（覆盖现有数据）。
   * @param text 备份 JSON 文本
   * @returns 导入统计
   * @throws JSON 解析失败或版本不兼容时抛出错误
   */
  async importFromText(text: string): Promise<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('备份文件不是合法的 JSON');
    }
    if (!isBackupFile(parsed)) throw new Error('备份文件结构不正确');
    if (parsed.version > BACKUP_VERSION) {
      throw new Error(`备份版本（v${parsed.version}）高于当前应用支持的 v${BACKUP_VERSION}，请升级应用`);
    }

    const { data } = parsed;
    // 先还原图片 Blob，避免在事务里做耗时的 Base64 解码
    const images = await Promise.all(
      (data.images ?? []).map(async (item) => ({
        id: item.id,
        clothingId: item.clothingId,
        blob: await dataUrlToBlob(item.dataUrl),
        thumbnail: await dataUrlToBlob(item.thumbnailUrl),
        width: item.width,
        height: item.height,
        sortOrder: item.sortOrder,
        isMain: item.isMain,
        createdAt: item.createdAt
      }))
    );

    await db.transaction(
      'rw',
      [
        db.wardrobes,
        db.clothes,
        db.images,
        db.tags,
        db.clothingTags,
        db.outfits,
        db.outfitItems,
        db.diaries,
        db.wearRecords,
        db.settings
      ],
      async () => {
        await wardrobeRepo.clear();
        await clothingRepo.clear();
        await imageRepo.clear();
        await tagRepo.clear();
        await clothingRepo.clearRelations();
        await outfitRepo.clear();
        await outfitRepo.clearItems();
        await diaryRepo.clear();
        await diaryRepo.clearWearRecords();
        await settingRepo.clear();

        await wardrobeRepo.bulkPut(data.wardrobes as never[]);
        await clothingRepo.bulkPut(data.clothes as never[]);
        await imageRepo.bulkPut(images);
        await tagRepo.bulkPut(data.tags as never[]);
        await clothingRepo.bulkPutRelations(data.clothingTags as never[]);
        await outfitRepo.bulkPut(data.outfits as never[]);
        await outfitRepo.bulkPutItems(data.outfitItems as never[]);
        await diaryRepo.bulkPut(data.diaries as never[]);
        await diaryRepo.bulkPutWearRecords(data.wearRecords as never[]);
        await settingRepo.bulkPut(data.settings as never[]);
      }
    );

    imageService.releaseAll();

    return {
      counts: {
        wardrobes: data.wardrobes?.length ?? 0,
        clothes: data.clothes?.length ?? 0,
        images: images.length,
        tags: data.tags?.length ?? 0,
        outfits: data.outfits?.length ?? 0,
        diaries: data.diaries?.length ?? 0,
        wearRecords: data.wearRecords?.length ?? 0
      }
    };
  }
};
