/**
 * models 层统一出口：只放纯类型与常量，不引入任何运行时依赖。
 */
export type { Wardrobe, WardrobeDraft, WardrobeShape, WardrobeTone } from './wardrobe';
export {
  WARDROBE_SHAPES,
  WARDROBE_TONES,
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  isWardrobeShape,
  isWardrobeTone
} from './wardrobe';
export type { Clothing, ClothingStatus, ClothingImage, ClothingTag, ClothingFormData } from './clothing';
export { CLOTHING_STATUS_LABEL } from './clothing';
export type { Tag, TagType, TagTreeNode } from './tag';
export { TAG_TYPE_LABEL, TAG_TYPES } from './tag';
export type { Outfit, OutfitItem, OutfitSlot } from './outfit';
export { OUTFIT_SLOT_LABEL, OUTFIT_SLOTS, OUTFIT_SLOT_CATEGORY } from './outfit';
export type { DiaryEntry, WearRecord } from './diary';
export type {
  Setting,
  AppTheme,
  SortKey,
  AiConfig,
  AiProvider,
  AiProviderPreset,
  BackupFile,
  BackupData,
  BackupImage
} from './setting';
export {
  SORT_KEY_LABEL,
  AI_PROVIDER_PRESETS,
  SETTING_KEYS,
  DEFAULT_APP_NAME,
  DEFAULT_AI_CONFIG,
  APP_VERSION
} from './setting';
