/**
 * ClothingCard：衣服卡片。
 * 粗描边 + 硬阴影，图片区角落有几何装饰（hover 时各自漂移），
 * 名字在 hover 时做 Pop Swap 撞色反转。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import FavoriteButton from './FavoriteButton.vue';
import {
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  isWardrobeShape
} from '@/models';
import type { GeoColor, GeoShape } from '@/components/base/types';
import type { ClothingListItem } from '@/services';

const props = defineProps<{
  /** 衣服列表条目 */
  item: ClothingListItem;
}>();

const emit = defineEmits<{
  /** 点击卡片主体 */
  (event: 'select', id: string): void;
  /** 点击收藏按钮 */
  (event: 'favorite', id: string): void;
}>();

/** 是否处于待清洗状态 */
const needsWash = computed(() => props.item.clothing.status === 'to_wash');

/** 所属衣柜的标识形状 */
const wardrobeShape = computed<GeoShape>(() =>
  isWardrobeShape(props.item.wardrobeIcon) ? props.item.wardrobeIcon : DEFAULT_WARDROBE_SHAPE
);

/** 所属衣柜的标识撞色：卡片上统一用默认撞色，避免与图片抢色 */
const wardrobeTone: GeoColor = DEFAULT_WARDROBE_TONE;

/**
 * 点击卡片主体。
 */
function handleSelect(): void {
  emit('select', props.item.clothing.id);
}

/**
 * 转发收藏点击（stopPropagation 已在 FavoriteButton 内部处理）。
 */
function handleFavorite(): void {
  emit('favorite', props.item.clothing.id);
}
</script>

<template>
  <article class="card m-card m-card--press" @click="handleSelect">
    <div class="card__media">
      <img
        v-if="props.item.thumbnailUrl"
        class="card__image"
        :src="props.item.thumbnailUrl"
        :alt="props.item.clothing.name"
        loading="lazy"
      />

      <div v-else class="card__placeholder">
        <AppIcon name="hanger" :size="34" :stroke-width="2.2" />
      </div>

      <AppGeo class="card__geo-square" shape="square" color="yellow" size="sm" :orbit="1" />

      <span v-if="needsWash" class="card__wash">待清洗</span>

      <div class="card__fav">
        <FavoriteButton
          :active="props.item.clothing.favorite"
          size="sm"
          @toggle="handleFavorite"
        />
      </div>
    </div>

    <div class="card__info">
      <AppGeo class="card__geo-tri" shape="triangle" color="green" size="sm" :orbit="2" :at="'tr'" />

      <p class="card__name m-pop ellipsis">{{ props.item.clothing.name }}</p>

      <p class="card__meta ellipsis">
        <AppGeo :shape="wardrobeShape" :color="wardrobeTone" size="xs" />
        <span class="m-mono card__code">{{ props.item.clothing.code }}</span>
        <span v-if="props.item.wardrobeName" class="card__wardrobe">· {{ props.item.wardrobeName }}</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.card {
  --m-pop: var(--m-cyan);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}

.card__media {
  position: relative;
  aspect-ratio: 3 / 4;
  background-color: var(--m-surface-2);
  border-bottom: var(--m-line);
}

.card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--m-text-muted);
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0,
    transparent 8px,
    var(--m-surface) 8px,
    var(--m-surface) 16px
  );
}

/* 图片区左上角的方块装饰 */
.card__geo-square {
  position: absolute;
  top: 10px;
  left: 10px;
}

.card__wash {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px var(--m-2);
  border: 2px solid var(--m-line-color);
  background-color: var(--m-yellow);
  color: var(--m-on-accent);
  font-size: 11px;
  font-weight: var(--m-weight-black);
}

.card__fav {
  position: absolute;
  right: 10px;
  bottom: 10px;
}

.card__info {
  position: relative;
  padding: var(--m-3);
  background-color: var(--m-surface);
}

.card__geo-tri {
  top: 8px;
}

.card__name {
  padding-right: 26px;
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
  color: var(--m-text);
  line-height: 1.35;
}

.card__meta {
  display: flex;
  align-items: center;
  gap: var(--m-1);
  margin-top: 4px;
  font-size: 11px;
  color: var(--m-text-muted);
}

.card__code {
  font-weight: var(--m-weight-bold);
}

.card__wardrobe {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
