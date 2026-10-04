/**
 * services 层统一出口。
 */
export { settingsService } from './settingsService';
export { wardrobeService } from './wardrobeService';
export type { DeleteWardrobeResult } from './wardrobeService';
export { tagService } from './tagService';
export type { TagDraft } from './tagService';
export { clothingService } from './clothingService';
export type { ClothingListItem, ClothingDetail } from './clothingService';
export { imageService } from './imageService';
export type { ImageVariant } from './imageService';
export { searchService } from './searchService';
export type { FilterQuery } from './searchService';
export { EMPTY_FILTER } from './searchService';
export { sortService, defaultDirection } from './sortService';
export { outfitService } from './outfitService';
export type { OutfitDetail } from './outfitService';
export { diaryService } from './diaryService';
export type { DiaryDraft } from './diaryService';
export { backupService } from './backupService';
export type { ImportResult } from './backupService';
export { BACKUP_VERSION } from './backupService';
export { aiService } from './aiService';
export type { RecognizeResult, RecommendParams, RecommendResult, TestConnectionResult } from './aiService';
export { recommendService } from './recommendService';
export type { RuleRecommendParams, RuleRecommendResult, RuleRecommendItem } from './recommendService';
