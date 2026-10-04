/**
 * 首次启动的数据初始化：写入预设标签与默认衣柜（幂等）。
 */
import { db } from './index';
import { createId } from '@/utils/id';
import {
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  SETTING_KEYS,
  type Tag,
  type TagType,
  type Wardrobe
} from '@/models';

/** 预设标签的声明结构：一级标签可带 children */
interface PresetTagNode {
  /** 标签名 */
  name: string;
  /** 颜色类标签的展示色 */
  color?: string;
  /** 二级子标签名列表 */
  children?: string[];
}

/** 品类预设（一级 + 二级） */
const PRESET_CATEGORY: PresetTagNode[] = [
  { name: '上装', children: ['短袖', 'T恤', '衬衫', '卫衣', '毛衣'] },
  { name: '下装', children: ['长裤', '短裤', '半身裙', '牛仔裤'] },
  { name: '连衣裙' },
  { name: '外套', children: ['夹克', '风衣', '大衣', '羽绒服'] },
  { name: '鞋' },
  { name: '包' },
  { name: '饰品' }
];

/** 季节预设 */
const PRESET_SEASON: PresetTagNode[] = [{ name: '春' }, { name: '夏' }, { name: '秋' }, { name: '冬' }];

/** 颜色预设（带色块） */
const PRESET_COLOR: PresetTagNode[] = [
  { name: '黑', color: '#1a1a1a' },
  { name: '白', color: '#ffffff' },
  { name: '灰', color: '#9e9e9e' },
  { name: '红', color: '#e74c3c' },
  { name: '粉', color: '#ff9ec4' },
  { name: '橙', color: '#ff9f43' },
  { name: '黄', color: '#f7d154' },
  { name: '绿', color: '#2ecc71' },
  { name: '蓝', color: '#3d8bfd' },
  { name: '紫', color: '#9b59b6' },
  { name: '棕', color: '#8d6e63' },
  { name: '米', color: '#efe3c8' },
  { name: '多色', color: 'linear-gradient(135deg,#ff7a59,#3d8bfd,#2ecc71)' }
];

/** 场合预设 */
const PRESET_OCCASION: PresetTagNode[] = [
  { name: '日常' },
  { name: '通勤' },
  { name: '运动' },
  { name: '约会' },
  { name: '聚会' },
  { name: '居家' }
];

/** 风格预设 */
const PRESET_STYLE: PresetTagNode[] = [
  { name: '休闲' },
  { name: '正式' },
  { name: '运动' },
  { name: '甜美' },
  { name: '街头' },
  { name: '复古' }
];

/** 全部预设标签，按类型分组 */
const PRESET_GROUPS: { type: TagType; nodes: PresetTagNode[] }[] = [
  { type: 'category', nodes: PRESET_CATEGORY },
  { type: 'season', nodes: PRESET_SEASON },
  { type: 'color', nodes: PRESET_COLOR },
  { type: 'occasion', nodes: PRESET_OCCASION },
  { type: 'style', nodes: PRESET_STYLE }
];

/** 默认衣柜名 */
export const DEFAULT_WARDROBE_NAME = '我的衣柜';

/**
 * 把一组预设标签声明展开成 Tag 记录（一级/二级）。
 * @param type 标签类型
 * @param nodes 预设声明
 * @param now 创建时间戳
 * @returns 展开后的标签记录数组（一级在前、其子标签紧随其后）
 */
function buildPresetTags(type: TagType, nodes: PresetTagNode[], now: number): Tag[] {
  const result: Tag[] = [];
  let order = 0;
  for (const node of nodes) {
    const parentId = createId();
    result.push({
      id: parentId,
      name: node.name,
      type,
      color: node.color,
      sortOrder: order++,
      isPreset: true,
      createdAt: now
    });
    for (const childName of node.children ?? []) {
      result.push({
        id: createId(),
        name: childName,
        type,
        parentId,
        sortOrder: order++,
        isPreset: true,
        createdAt: now
      });
    }
  }
  return result;
}

/**
 * 确保预设标签与默认衣柜存在。幂等：已初始化过则直接返回。
 * @returns 默认衣柜（已存在时返回库中排序最靠前的衣柜）
 */
export async function seedIfNeeded(): Promise<Wardrobe> {
  const seededFlag = await db.settings.get(SETTING_KEYS.seeded);

  let defaultWardrobe = await db.wardrobes.orderBy('sortOrder').first();

  if (seededFlag?.value !== true) {
    const now = Date.now();
    const tags: Tag[] = [];
    for (const group of PRESET_GROUPS) {
      tags.push(...buildPresetTags(group.type, group.nodes, now));
    }

    if (!defaultWardrobe) {
      defaultWardrobe = {
        id: createId(),
        name: DEFAULT_WARDROBE_NAME,
        icon: DEFAULT_WARDROBE_SHAPE,
        color: DEFAULT_WARDROBE_TONE,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now
      };
    }

    // 事务保证标签与设置一起写入，避免出现"标签写了一半"的脏状态
    await db.transaction('rw', db.tags, db.wardrobes, db.settings, async () => {
      await db.tags.bulkPut(tags);
      await db.wardrobes.put(defaultWardrobe as Wardrobe);
      await db.settings.put({ key: SETTING_KEYS.seeded, value: true });
      await db.settings.put({ key: SETTING_KEYS.defaultWardrobeId, value: (defaultWardrobe as Wardrobe).id });
    });

    return defaultWardrobe;
  }

  // 已初始化过但衣柜被清空时补一个，保证应用始终有可用衣柜
  if (!defaultWardrobe) {
    const now = Date.now();
    defaultWardrobe = {
      id: createId(),
      name: DEFAULT_WARDROBE_NAME,
      icon: DEFAULT_WARDROBE_SHAPE,
      color: DEFAULT_WARDROBE_TONE,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };
    await db.wardrobes.put(defaultWardrobe);
  }

  return defaultWardrobe;
}
