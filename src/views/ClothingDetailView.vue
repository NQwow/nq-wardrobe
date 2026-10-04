<!--
  ClothingDetailView：衣服详情页。
  孟菲斯风格：粗黑描边 + 无模糊硬阴影 + 几何装饰（hover 时各自漂移）。
  布局：移动端单列 + 底部固定操作条；≥700px 两列（左图右信息），操作条回到信息列内。
  业务逻辑保持不变：图片 URL 缓存/释放、衣柜直改、状态与收藏切换、标签分组、二次确认删除。
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import FavoriteButton from '@/components/business/FavoriteButton.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import StatusBadge from '@/components/business/StatusBadge.vue';
import type { SelectOption } from '@/components/base/types';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { CLOTHING_STATUS_LABEL, TAG_TYPES, TAG_TYPE_LABEL, type TagType } from '@/models';
import { imageService, type ClothingDetail } from '@/services';
import { useClothingStore, useTagStore, useWardrobeStore } from '@/stores';
import { formatDateTime, formatRelativeDay } from '@/utils/date';

/** 详情页顶部的固定标题文案 */
const PAGE_TITLE = '衣服详情';

/** 标签分组的展示顺序与标题 */
const TAG_GROUP_ORDER: TagType[] = TAG_TYPES;

const route = useRoute();
const router = useRouter();
const clothingStore = useClothingStore();
const wardrobeStore = useWardrobeStore();
const tagStore = useTagStore();
const toast = useToast();
const { confirm } = useConfirm();

/** 衣服详情数据 */
const detail = ref<ClothingDetail>();
/** 详情加载中 */
const loading = ref(true);
/** 加载完成后衣服是否不存在 */
const notFound = ref(false);
/** 图片 id → objectURL 的本地缓存（用于轮播展示，卸载时统一释放） */
const imageUrls = ref<Map<string, string>>(new Map());
/** 当前轮播到第几张（从 0 开始） */
const currentIndex = ref(0);

/** 路由参数里的衣服 id（收窄为字符串） */
const clothingId = computed<string>(() => {
  const raw = route.params.id;
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
});

/** 轮播图片：按 sortOrder 升序排列，主图排在最前 */
const carouselImages = computed(() => {
  const images = detail.value?.images ?? [];
  return [...images].sort((left, right) => {
    if (left.isMain !== right.isMain) return left.isMain ? -1 : 1;
    return left.sortOrder - right.sortOrder;
  });
});

/** 当前选中的衣柜 id（用于 AppSelect 的 v-model） */
const selectedWardrobeId = computed<string>({
  get: () => detail.value?.clothing.wardrobeId ?? '',
  set: (value: string) => {
    void handleWardrobeChange(value);
  }
});

/** 衣柜下拉选项（衣柜标识已改为几何令牌，不再拼进文案） */
const wardrobeOptions = computed<SelectOption[]>(() =>
  wardrobeStore.list.map((wardrobe) => ({
    value: wardrobe.id,
    label: wardrobe.name
  }))
);

/** 已关联标签按类型分组后的结果（空组会被过滤） */
const tagGroups = computed(() =>
  TAG_GROUP_ORDER.map((type) => ({
    type,
    label: TAG_TYPE_LABEL[type],
    tags: (detail.value?.tags ?? []).filter((tag) => tag.type === type)
  })).filter((group) => group.tags.length > 0)
);

/**
 * 颜色类标签中「颜色值 → 孟菲斯撞色令牌」的映射。
 * 撞色只有 5 个色相 + 墨色/表面色，这里把 12 个预设色值归到最接近的令牌，
 * 既能一眼看出颜色家族，又不写死 hex（颜色全部来自 --m-* 令牌）。
 */
const COLOR_TONE_MAP: Record<string, string> = {
  '#000000': 'ink',
  '#ffffff': 'surface',
  '#808080': 'ink',
  '#ff0000': 'red',
  '#ff69b4': 'pink',
  '#ff7a00': 'red',
  '#ffd700': 'yellow',
  '#008000': 'green',
  '#0000ff': 'cyan',
  '#800080': 'pink',
  '#8b4513': 'ink',
  '#f5f5dc': 'surface'
};

/**
 * 取颜色类标签对应的色块样式类。
 * @param color 标签上的颜色值（形如 #rrggbb）
 * @returns 命中的类名；未命中时返回空串（使用默认色块）
 */
function tagToneClass(color?: string): string {
  if (!color) return '';
  const tone = COLOR_TONE_MAP[color.trim().toLowerCase()];
  return tone ? `detail__tag-dot--${tone}` : '';
}

/** 是否处于操作请求中，避免重复点击 */
const busy = ref(false);

/**
 * 读取衣服详情并在图片加载后释放本地缓存的 objectURL。
 * @param id 衣服 id
 */
async function loadDetail(id: string): Promise<void> {
  releaseImages();
  loading.value = true;
  notFound.value = false;
  try {
    const result = await clothingStore.getDetail(id);
    if (!result) {
      notFound.value = true;
      detail.value = undefined;
      return;
    }
    detail.value = result;

    const next = new Map<string, string>();
    await Promise.all(
      result.images.map(async (image) => {
        const url = await imageService.getUrl(image.id, 'full');
        if (url) next.set(image.id, url);
      })
    );
    imageUrls.value = next;
    currentIndex.value = 0;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '衣服详情加载失败');
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

/**
 * 释放本地缓存的全尺寸图片 objectURL。
 */
function releaseImages(): void {
  for (const id of imageUrls.value.keys()) {
    imageService.release(id);
  }
  imageUrls.value = new Map();
}

/**
 * 读取某张图片已解析好的对象 URL。
 * @param imageId 图片 id
 * @returns objectURL，未解析完成时返回空串
 */
function urlOf(imageId: string): string {
  return imageUrls.value.get(imageId) ?? '';
}

/**
 * 跳转到编辑页。
 */
function goEdit(): void {
  void router.push({ name: 'clothing-edit', params: { id: clothingId.value } });
}

/**
 * 轮播滚动时更新当前页码。
 * @param event 滚动事件
 */
function handleScroll(event: Event): void {
  const target = event.currentTarget as HTMLElement | null;
  if (!target || !target.clientWidth) return;
  const index = Math.round(target.scrollLeft / target.clientWidth);
  currentIndex.value = Math.min(Math.max(index, 0), Math.max(carouselImages.value.length - 1, 0));
}

/**
 * 切换收藏状态并同步本地详情。
 */
async function handleFavoriteToggle(): Promise<void> {
  const current = detail.value;
  if (!current || busy.value) return;
  busy.value = true;
  try {
    const favorite = await clothingStore.toggleFavorite(current.clothing.id);
    current.clothing.favorite = favorite;
    toast.success(favorite ? '已加入收藏' : '已取消收藏');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '收藏操作失败');
  } finally {
    busy.value = false;
  }
}

/**
 * 点击状态徽章：在「正常 / 待清洗」之间切换并同步本地详情。
 */
async function handleStatusClick(): Promise<void> {
  const current = detail.value;
  if (!current || busy.value) return;
  busy.value = true;
  try {
    const status = await clothingStore.setStatus(current.clothing.id);
    current.clothing.status = status;
    toast.success(`已标记为「${CLOTHING_STATUS_LABEL[status]}」`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '状态修改失败');
  } finally {
    busy.value = false;
  }
}

/**
 * 切换所属衣柜，成功后同步本地详情的衣柜信息。
 * @param wardrobeId 目标衣柜 id
 */
async function handleWardrobeChange(wardrobeId: string): Promise<void> {
  const current = detail.value;
  if (!current || !wardrobeId || wardrobeId === current.clothing.wardrobeId || busy.value) return;
  busy.value = true;
  try {
    await clothingStore.moveToWardrobe(current.clothing.id, wardrobeId);
    const changed = await clothingStore.getDetail(current.clothing.id);
    if (changed) detail.value = changed;
    toast.success('已更换所属衣柜');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '更换衣柜失败');
  } finally {
    busy.value = false;
  }
}

/**
 * 点击标签区域：跳到编辑页修改标签。
 */
function handleTagClick(): void {
  goEdit();
}

/**
 * 删除衣服：二次确认后软删除并返回上一页。
 */
async function handleDelete(): Promise<void> {
  const current = detail.value;
  if (!current || busy.value) return;
  const accepted = await confirm({
    title: '删除衣服',
    message: '删除后无法恢复，确定要删除吗？',
    danger: true
  });
  if (!accepted) return;

  busy.value = true;
  try {
    await clothingStore.remove(current.clothing.id);
    toast.success('已删除');
    releaseImages();
    await router.back();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败');
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!wardrobeStore.list.length) {
    try {
      await wardrobeStore.load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '衣柜列表加载失败');
    }
  }
  if (!tagStore.list.length) {
    try {
      await tagStore.load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '标签加载失败');
    }
  }
  if (clothingId.value) {
    await loadDetail(clothingId.value);
  } else {
    loading.value = false;
    notFound.value = true;
  }
});

// 路由 id 变化时（组件被复用的场景）重新加载详情
watch(clothingId, async (id, previous) => {
  if (!id || id === previous) return;
  await loadDetail(id);
});

onUnmounted(() => {
  releaseImages();
});
</script>

<template>
  <div class="page page--with-header detail">
    <PageHeader :title="PAGE_TITLE" :back="true">
      <button class="detail__edit-icon" type="button" aria-label="编辑" @click="goEdit">
        <AppIcon name="pencil" :size="18" :stroke-width="2.6" />
      </button>
    </PageHeader>

    <div class="page__body detail__body">
      <template v-if="loading">
        <div class="detail__skeleton skeleton" />
        <div class="detail__skeleton detail__skeleton--short skeleton" />
      </template>

      <AppEmpty
        v-else-if="notFound || !detail"
        motif="hanger"
        title="衣服不存在或已被删除"
        description="它可能已经被删除，返回衣柜看看其它衣服吧"
      >
        <AppButton type="secondary" size="sm" @click="router.back()">返回</AppButton>
      </AppEmpty>

      <div v-else class="detail__grid">
        <!-- 大图轮播：粗描边外框 + 硬阴影，四个角外面挂几何装饰 -->
        <section class="m-card detail__gallery">
          <AppGeo class="detail__geo detail__geo--out-tl" shape="square" color="cyan" size="sm" :orbit="1" />
          <AppGeo class="detail__geo detail__geo--out-br" shape="ring" color="pink" size="sm" :orbit="4" />

          <div v-if="carouselImages.length" class="detail__track scroll-x" @scroll.passive="handleScroll">
            <div v-for="image in carouselImages" :key="image.id" class="detail__slide">
              <img
                v-if="urlOf(image.id)"
                class="detail__image"
                :src="urlOf(image.id)"
                :alt="detail.clothing.name"
              />
              <div v-else class="detail__image detail__image--loading skeleton" />
            </div>
          </div>

          <div v-else class="detail__no-image">
            <AppIcon name="image" :size="30" :stroke-width="2.2" />
            <span>暂无图片</span>
          </div>

          <div v-if="carouselImages.length > 1" class="detail__dots">
            <span
              v-for="(image, index) in carouselImages"
              :key="image.id"
              class="detail__dot"
              :class="{ 'detail__dot--active': index === currentIndex }"
            />
          </div>

          <span class="m-band m-stripes detail__band" aria-hidden="true" />
        </section>

        <div class="detail__info">
          <!-- 编号 + 名字 -->
          <section class="m-card m-card--pad detail__section">
            <AppGeo class="detail__geo detail__geo--in-tr" shape="circle" color="yellow" size="md" :orbit="2" />
            <span class="m-strip detail__code m-mono">{{ detail.clothing.code }}</span>
            <h1 class="m-h1 m-pop detail__name">{{ detail.clothing.name }}</h1>
            <span class="m-band m-zigzag detail__name-band" aria-hidden="true" />
          </section>

          <!-- 所属衣柜 -->
          <section class="m-card m-card--pad detail__section">
            <h2 class="m-section-title">所属衣柜</h2>
            <AppSelect
              v-model="selectedWardrobeId"
              :options="wardrobeOptions"
              placeholder="请选择衣柜"
              :disabled="busy"
            />
          </section>

          <!-- 标签 -->
          <section class="m-card m-card--pad detail__section detail__section--clickable" @click="handleTagClick">
            <AppGeo class="detail__geo detail__geo--out-br" shape="diamond" color="pink" size="sm" :orbit="3" />

            <div class="m-row m-row--between detail__section-head">
              <h2 class="m-section-title">标签</h2>
              <span class="m-caption">点击修改</span>
            </div>

            <div v-if="tagGroups.length" class="detail__tag-groups">
              <div v-for="group in tagGroups" :key="group.type" class="detail__tag-group">
                <span class="m-section-title detail__tag-group-title" :class="`detail__accent--${group.type}`">
                  {{ group.label }}
                </span>
                <span class="detail__tags">
                  <span v-for="tag in group.tags" :key="tag.id" class="detail__tag">
                    <span
                      v-if="tag.color"
                      class="detail__tag-dot"
                      :class="tagToneClass(tag.color)"
                      aria-hidden="true"
                    />
                    {{ tag.name }}
                  </span>
                </span>
              </div>
            </div>
            <p v-else class="m-caption">暂无标签，点击添加</p>
          </section>

          <!-- 状态 + 收藏 -->
          <section class="m-card m-card--pad detail__section">
            <AppGeo class="detail__geo detail__geo--in-tr" shape="triangle" color="green" size="sm" :orbit="5" />
            <h2 class="m-section-title">状态与收藏</h2>

            <div class="detail__rows">
              <div class="detail__row">
                <div class="detail__row-main">
                  <span class="detail__row-label">状态</span>
                  <span class="m-caption">点击徽章可切换</span>
                </div>
                <StatusBadge :status="detail.clothing.status" :clickable="!busy" @click="handleStatusClick" />
              </div>

              <div class="detail__row">
                <div class="detail__row-main">
                  <span class="detail__row-label">收藏</span>
                  <span class="m-caption">{{ detail.clothing.favorite ? '已收藏' : '未收藏' }}</span>
                </div>
                <FavoriteButton :active="detail.clothing.favorite" @toggle="handleFavoriteToggle" />
              </div>
            </div>
          </section>

          <!-- 备注 -->
          <section class="m-card m-card--pad detail__section">
            <h2 class="m-section-title">备注</h2>
            <p v-if="detail.clothing.note" class="m-prose detail__note">{{ detail.clothing.note }}</p>
            <p v-else class="m-caption">暂无备注</p>
          </section>

          <!-- 穿着与时间信息 -->
          <section class="m-card m-card--pad detail__section">
            <AppGeo class="detail__geo detail__geo--out-bl" shape="cross" color="cyan" size="sm" :orbit="4" />
            <h2 class="m-section-title">穿着记录</h2>

            <div class="detail__facts">
              <div class="m-fact">
                <span class="m-fact__label">穿着次数</span>
                <span class="m-fact__value m-mono">{{ detail.clothing.wearCount }} 次</span>
              </div>
              <div class="m-fact">
                <span class="m-fact__label">最后穿着</span>
                <span class="m-fact__value">
                  {{ formatRelativeDay(detail.clothing.lastWornAt) }}
                  <template v-if="detail.clothing.lastWornAt">
                    （{{ formatDateTime(detail.clothing.lastWornAt) }}）
                  </template>
                </span>
              </div>
              <div class="m-fact">
                <span class="m-fact__label">创建时间</span>
                <span class="m-fact__value">{{ formatDateTime(detail.clothing.createdAt) }}</span>
              </div>
              <div class="m-fact">
                <span class="m-fact__label">更新时间</span>
                <span class="m-fact__value">{{ formatDateTime(detail.clothing.updatedAt) }}</span>
              </div>
            </div>
          </section>

          <!-- 操作条：<1024px 固定在底部导航之上，≥1024px 变成信息列里的普通按钮行 -->
          <div class="detail__actions">
            <AppButton block icon="pencil" @click="goEdit">编辑</AppButton>
            <AppButton type="danger" block icon="trash" :loading="busy" @click="handleDelete">删除</AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页头右侧的铅笔图标按钮 */
.detail__edit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .detail__edit-icon:hover {
    background-color: var(--m-yellow);
    box-shadow: var(--m-shadow-sm);
  }
}

.detail__edit-icon:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.detail__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
  /* 预留移动端固定操作条的高度 */
  padding-bottom: calc(var(--m-8) + 84px);
}

@media (min-width: 640px) {
  .detail__body {
    gap: var(--m-6);
  }
}

@media (min-width: 1024px) {
  /* 桌面端操作条回到信息列内，不再需要额外留白 */
  .detail__body {
    padding-bottom: var(--m-9);
  }
}

.detail__skeleton {
  height: 220px;
  border: var(--m-line);
}

.detail__skeleton--short {
  height: 72px;
}

/* ---------------- 两列栅格 ---------------- */

.detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-5);
  align-items: start;
}

@media (min-width: 640px) {
  .detail__grid {
    gap: var(--m-6);
  }
}

@media (min-width: 700px) {
  .detail__grid {
    grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
    gap: var(--m-7);
  }
}

@media (min-width: 1440px) {
  .detail__grid {
    grid-template-columns: minmax(0, 480px) minmax(0, 1fr);
    gap: var(--m-8);
  }
}

.detail__info {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

@media (min-width: 640px) {
  .detail__info {
    gap: var(--m-6);
  }
}

/* ---------------- 图片轮播 ---------------- */

.detail__gallery {
  padding: var(--m-3);
}

/* 轮播卡片不参与「按下贴地」，避免拖动图片时整卡位移 */
.detail__gallery:active {
  transform: none;
  box-shadow: var(--m-shadow);
}

.detail__track {
  display: flex;
  scroll-snap-type: x mandatory;
}

.detail__slide {
  flex: 0 0 100%;
  aspect-ratio: 4 / 5;
  scroll-snap-align: start;
  background-color: var(--m-surface-2);
}

.detail__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--m-surface-2);
}

.detail__no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--m-2);
  aspect-ratio: 4 / 5;
  background-color: var(--m-surface-2);
  color: var(--m-text-muted);
  font-size: var(--m-fs-sm);
}

/* 页码指示：方块而不是圆点，当前页用撞色填充 */
.detail__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--m-2);
  padding-top: var(--m-3);
}

.detail__dot {
  width: 12px;
  height: 12px;
  border: var(--m-line);
  background-color: var(--m-surface);
  transition: var(--m-transition);
}

.detail__dot--active {
  width: 20px;
  background-color: var(--m-cyan);
}

/* ---------------- 几何装饰 ---------------- */

.detail__geo {
  z-index: 3;
}

/* 挂在卡片边框外侧的角位，避开图片与文字 */
.detail__geo--out-tl {
  position: absolute;
  top: -12px;
  left: -12px;
}

.detail__geo--out-br {
  position: absolute;
  bottom: -12px;
  right: -12px;
}

.detail__geo--out-bl {
  position: absolute;
  bottom: -12px;
  left: -12px;
}

/* 卡片内的右上角（标题短，留白够） */
.detail__geo--in-tr {
  position: absolute;
  top: var(--m-4);
  right: var(--m-4);
}

/* ---------------- 信息分区 ---------------- */

.detail__section {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.detail__section-head {
  align-items: center;
}

.detail__section--clickable {
  cursor: pointer;
}

.detail__code {
  --m-strip-color: var(--m-cyan);
  display: inline-flex;
  align-self: flex-start;
  font-size: var(--m-fs-body);
}

.detail__name {
  --m-pop: var(--m-cyan);
  overflow-wrap: anywhere;
}

/* 名字下方一条短折线装饰带（图案用 currentColor 着色） */
.detail__name-band {
  display: block;
  width: 120px;
  margin-top: calc(-1 * var(--m-3));
  color: var(--m-red);
}

/* 图片框底部的斜纹装饰带 */
.detail__band {
  display: block;
  margin-top: var(--m-3);
  color: var(--m-text-muted);
}

/* ---------------- 标签 ---------------- */

.detail__tag-groups {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.detail__tag-group {
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
}

/* 分组标题沿用 .m-section-title，只把字号收到小标题档位 */
.detail__tag-group-title {
  font-size: var(--m-fs-sm);
}

/* 每类标签一个撞色方块，避免整页只有一种颜色 */
.detail__accent--category {
  --m-title-accent: var(--m-red);
}

.detail__accent--season {
  --m-title-accent: var(--m-green);
}

.detail__accent--color {
  --m-title-accent: var(--m-cyan);
}

.detail__accent--style {
  --m-title-accent: var(--m-pink);
}

.detail__accent--occasion {
  --m-title-accent: var(--m-yellow);
}

.detail__accent--material {
  --m-title-accent: var(--m-green);
}

.detail__accent--custom {
  --m-title-accent: var(--m-pink);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
}

/* 标签：按 .m-chip 的视觉写成直角小方块 */
.detail__tag {
  display: inline-flex;
  align-items: center;
  gap: var(--m-2);
  padding: var(--m-1) var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .detail__section--clickable:hover .detail__tag {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
  }
}

.detail__tag-dot {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-ink);
}

.detail__tag-dot--ink {
  background-color: var(--m-ink);
}

.detail__tag-dot--surface {
  background-color: var(--m-surface);
}

.detail__tag-dot--red {
  background-color: var(--m-red);
}

.detail__tag-dot--yellow {
  background-color: var(--m-yellow);
}

.detail__tag-dot--cyan {
  background-color: var(--m-cyan);
}

.detail__tag-dot--pink {
  background-color: var(--m-pink);
}

.detail__tag-dot--green {
  background-color: var(--m-green);
}

/* ---------------- 状态 / 收藏行 ---------------- */

.detail__rows {
  display: flex;
  flex-direction: column;
}

.detail__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m-4);
  padding: var(--m-3) 0;
}

.detail__row + .detail__row {
  border-top: var(--m-line);
}

.detail__row-main {
  display: flex;
  flex-direction: column;
  gap: var(--m-1);
  min-width: 0;
}

.detail__row-label {
  font-weight: var(--m-weight-bold);
  color: var(--m-text);
}

/* ---------------- 备注与只读信息 ---------------- */

.detail__note {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.detail__facts {
  display: flex;
  flex-direction: column;
}

/* ---------------- 底部操作条 ---------------- */

.detail__actions {
  position: fixed;
  left: var(--m-rail);
  right: 0;
  bottom: calc(var(--m-nav-h) + var(--m-safe-b));
  z-index: 30;
  display: flex;
  gap: var(--m-3);
  padding: var(--m-3) var(--m-4);
  background-color: var(--m-surface);
  border-top: var(--m-line);
  box-shadow: 0 -4px 0 0 var(--m-line-color);
}

@media (min-width: 1024px) {
  .detail__actions {
    position: static;
    bottom: auto;
    padding: 0;
    background-color: transparent;
    border-top: none;
    box-shadow: none;
  }
}
</style>
