<!-- 收藏页：孟菲斯风格。展示所有衣柜中已收藏的衣服，并支持搜索、衣柜/标签筛选与排序。 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClothingStore, useFilterStore, useWardrobeStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import AppButton from '@/components/base/AppButton.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppInput from '@/components/base/AppInput.vue';
import ClothingGrid from '@/components/business/ClothingGrid.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import SortSelect from '@/components/business/SortSelect.vue';
import TagFilterBar from '@/components/business/TagFilterBar.vue';
import WardrobeSelector from '@/components/business/WardrobeSelector.vue';

/** 搜索防抖时长（毫秒） */
const SEARCH_DEBOUNCE = 250;

const router = useRouter();
const toast = useToast();
const wardrobeStore = useWardrobeStore();
const clothingStore = useClothingStore();
const filterStore = useFilterStore();

/** 搜索框本地值（防抖前的输入内容） */
const searchKeyword = ref(filterStore.query.keyword);

/** 搜索防抖定时器 id */
let searchTimer: number | undefined;

/** 列表是否处于加载或筛选计算中（用于骨架屏） */
const isLoading = computed(() => clothingStore.loading || filterStore.computing);

/** 副标题：收藏件数 */
const subtitle = computed(() => `共 ${clothingStore.favorites.length} 件收藏`);

/** 除“只看收藏”外是否还有其它筛选条件 */
const hasExtraFilter = computed(() => {
  const query = filterStore.query;
  return (
    Boolean(query.keyword.trim()) ||
    query.wardrobeIds.length > 0 ||
    query.tagIds.length > 0 ||
    query.statuses.length > 0
  );
});

/** 空状态主文案 */
const emptyTitle = computed(() => (hasExtraFilter.value ? '没有符合条件的收藏' : '还没有收藏的衣服'));

/** 空状态补充说明 */
const emptyDescription = computed(() =>
  hasExtraFilter.value ? '换个关键词，或清空筛选条件再试试' : '在衣服详情或卡片上点小心心，就能收藏'
);

/**
 * 取消尚未执行的搜索防抖任务。
 */
function cancelSearchTimer(): void {
  if (searchTimer !== undefined) {
    window.clearTimeout(searchTimer);
    searchTimer = undefined;
  }
}

/**
 * 搜索输入变化：先更新本地值，250ms 后再写入筛选条件。
 * @param value 输入框最新值
 */
function handleKeywordInput(value: string): void {
  searchKeyword.value = value;
  cancelSearchTimer();
  searchTimer = window.setTimeout(() => {
    searchTimer = undefined;
    filterStore.setKeyword(searchKeyword.value);
  }, SEARCH_DEBOUNCE);
}

/**
 * 清空搜索框：跳过防抖立即生效。
 */
function handleKeywordClear(): void {
  cancelSearchTimer();
  searchKeyword.value = '';
  filterStore.setKeyword('');
}

/**
 * 清空搜索、衣柜、标签等筛选条件（保留“只看收藏”）。
 */
function handleResetFilters(): void {
  cancelSearchTimer();
  searchKeyword.value = '';
  filterStore.reset();
  filterStore.setFavoriteOnly(true);
}

/**
 * 打开衣服详情页。
 * @param id 衣服 id
 */
function handleSelect(id: string): void {
  void router.push({ name: 'clothing-detail', params: { id } });
}

/**
 * 把未知异常转换为可展示的中文提示。
 * @param error 捕获到的异常
 * @param fallback 兜底文案
 * @returns 提示文案
 */
function resolveErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * 切换收藏状态并给出提示。
 * @param id 衣服 id
 */
async function handleFavorite(id: string): Promise<void> {
  try {
    const favorite = await clothingStore.toggleFavorite(id);
    toast.success(favorite ? '已加入收藏' : '已取消收藏');
  } catch (error) {
    toast.error(resolveErrorMessage(error, '收藏操作失败'));
  }
}

/**
 * 加载衣柜与衣服数据（衣服已有缓存时跳过重复加载）。
 */
async function loadData(): Promise<void> {
  try {
    const tasks: Promise<void>[] = [wardrobeStore.load()];
    if (!clothingStore.loaded) tasks.push(clothingStore.load());
    await Promise.all(tasks);
  } catch (error) {
    toast.error(resolveErrorMessage(error, '收藏数据加载失败'));
  }
}

onMounted(() => {
  // 进入收藏页后只展示收藏的衣服，离开时还原
  filterStore.setFavoriteOnly(true);
  void loadData();
});

onUnmounted(() => {
  cancelSearchTimer();
  filterStore.setFavoriteOnly(false);
});
</script>

<template>
  <div class="page page--with-header">
    <PageHeader title="收藏" :subtitle="subtitle" tone="pink" />

    <div class="page__body">
      <!-- 筛选控制台：与衣柜页同一套语言，这里更简洁 -->
      <section class="filters m-card m-card--pad" aria-label="筛选与排序">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="half" color="pink" size="lg" :orbit="3" at="tr" />
          <AppGeo shape="diamond" color="cyan" size="md" :orbit="4" at="bl" />
          <AppGeo shape="square" color="yellow" size="sm" :orbit="1" at="br" />
        </div>

        <h2 class="m-section-title filters__title">筛选</h2>

        <div class="filters__grid">
          <div class="filters__block filters__search">
            <AppInput
              :model-value="searchKeyword"
              placeholder="搜索名字 / 编号 / 备注 / 标签名"
              icon="search"
              clearable
              @update:model-value="handleKeywordInput"
              @clear="handleKeywordClear"
            />
          </div>

          <div class="filters__block filters__wardrobe">
            <span class="m-label filters__label">衣柜</span>
            <WardrobeSelector
              :wardrobes="wardrobeStore.list"
              :selected-ids="filterStore.query.wardrobeIds"
              :counts="wardrobeStore.counts"
              @toggle="filterStore.toggleWardrobe"
              @clear="filterStore.clearWardrobes"
            />
          </div>

          <div class="filters__block filters__tools">
            <span class="m-label filters__label">标签与排序</span>
            <div class="filters__toolbar">
              <TagFilterBar
                :selected-ids="filterStore.query.tagIds"
                @toggle="filterStore.toggleTag"
                @clear="filterStore.clearTags"
              />
              <SortSelect
                class="filters__sort"
                :model-value="filterStore.sortKey"
                @update:model-value="filterStore.setSortKey"
              />
              <AppButton
                v-if="hasExtraFilter"
                type="secondary"
                tone="pink"
                size="sm"
                icon="close"
                class="filters__reset"
                @click="handleResetFilters"
              >
                清空筛选
              </AppButton>
            </div>
          </div>
        </div>
      </section>

      <ClothingGrid
        :items="filterStore.visibleItems"
        :loading="isLoading"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        empty-motif="heart"
        @select="handleSelect"
        @favorite="handleFavorite"
      />
    </div>
  </div>
</template>

<style scoped>
/* ------------------------- 筛选控制台 ------------------------- */

.filters {
  --m-title-accent: var(--m-pink);
  margin-bottom: var(--m-6);
  overflow: hidden;
}

.filters__title {
  margin-bottom: var(--m-5);
}

.filters__grid {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.filters__block {
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  min-width: 0;
}

.filters__label {
  display: block;
}

.filters__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--m-3);
}

.filters__sort {
  flex: 1 1 160px;
  min-width: 0;
}

.filters__reset {
  flex: 0 0 auto;
}

/* 平板起：搜索独立一行，衣柜与标签/排序并排 */
@media (min-width: 640px) {
  .filters__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'search search'
      'wardrobe tools';
    gap: var(--m-5) var(--m-6);
  }

  .filters__search {
    grid-area: search;
  }

  .filters__wardrobe {
    grid-area: wardrobe;
  }

  .filters__tools {
    grid-area: tools;
  }
}

/* 桌面：搜索窄一些，衣柜与工具并排，右侧留白加大 */
@media (min-width: 1024px) {
  .filters {
    margin-bottom: var(--m-8);
  }

  .filters__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
    grid-template-areas:
      'search search'
      'wardrobe tools';
    gap: var(--m-6) var(--m-8);
  }
}

/* 超宽屏：控制台内部留白再加大 */
@media (min-width: 1440px) {
  .filters__grid {
    gap: var(--m-6) var(--m-10);
  }
}
</style>
