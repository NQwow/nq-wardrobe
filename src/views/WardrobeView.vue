<!-- 我的衣柜（主界面）：孟菲斯风格。搜索 + 衣柜/标签/状态筛选 + 排序 + 网格浏览 + 悬浮新增入口。 -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CLOTHING_STATUS_LABEL, type ClothingStatus } from '@/models';
import { useClothingStore, useFilterStore, useSettingsStore, useWardrobeStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import AppButton from '@/components/base/AppButton.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import ClothingGrid from '@/components/business/ClothingGrid.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import SortSelect from '@/components/business/SortSelect.vue';
import TagFilterBar from '@/components/business/TagFilterBar.vue';
import WardrobeSelector from '@/components/business/WardrobeSelector.vue';

/** 搜索防抖时长（毫秒） */
const SEARCH_DEBOUNCE = 250;

/** 状态筛选项 */
interface StatusOption {
  /** 状态值 */
  value: ClothingStatus;
  /** 展示文案 */
  label: string;
}

/** 可筛选的衣服状态 */
const statusOptions: StatusOption[] = [
  { value: 'normal', label: CLOTHING_STATUS_LABEL.normal },
  { value: 'to_wash', label: CLOTHING_STATUS_LABEL.to_wash }
];

const router = useRouter();
const toast = useToast();
const settingsStore = useSettingsStore();
const wardrobeStore = useWardrobeStore();
const clothingStore = useClothingStore();
const filterStore = useFilterStore();

/** 搜索框本地值（防抖前的输入内容） */
const searchKeyword = ref(filterStore.query.keyword);

/** 搜索防抖定时器 id */
let searchTimer: number | undefined;

/** 列表是否处于加载或筛选计算中（用于骨架屏） */
const isLoading = computed(() => clothingStore.loading || filterStore.computing);

/** 空状态主文案：有筛选条件时提示无匹配结果 */
const emptyTitle = computed(() => (filterStore.hasFilter ? '没有符合条件的衣服' : '还没有衣服'));

/** 空状态补充说明 */
const emptyDescription = computed(() =>
  filterStore.hasFilter ? '换个关键词，或清空筛选条件再试试' : '点右下角 + 添加你的第一件衣服吧'
);

/** 当前选中状态的数量（用于筛选面板上的计数徽章） */
const activeStatusCount = computed(() => filterStore.query.statuses.length);

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
 * 清空全部筛选条件，并同步搜索框显示。
 */
function handleResetFilters(): void {
  cancelSearchTimer();
  searchKeyword.value = '';
  filterStore.reset();
}

/**
 * 打开衣服详情页。
 * @param id 衣服 id
 */
function handleSelect(id: string): void {
  void router.push({ name: 'clothing-detail', params: { id } });
}

/**
 * 跳转新增衣服页。
 */
function goCreate(): void {
  void router.push({ name: 'clothing-new' });
}

/**
 * 跳转设置页。
 */
function goSettings(): void {
  void router.push({ name: 'settings' });
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
    toast.error(resolveErrorMessage(error, '衣柜数据加载失败'));
  }
}

onMounted(() => {
  void loadData();
});

onBeforeUnmount(() => {
  cancelSearchTimer();
});
</script>

<template>
  <div class="page page--with-header">
    <PageHeader :title="settingsStore.appName">
      <AppButton type="text" size="sm" icon="sliders" @click="goSettings">设置</AppButton>
    </PageHeader>

    <div class="page__body">
      <!-- 筛选控制台：一块带撞色几何装饰的面板（几何装饰放在 .m-card 内，hover 会各自漂移） -->
      <section class="filters m-card m-card--pad" aria-label="筛选与排序">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="circle" color="yellow" size="lg" :orbit="1" at="tr" />
          <AppGeo shape="triangle" color="cyan" size="md" :orbit="2" at="bl" />
          <AppGeo shape="ring" color="pink" size="md" :orbit="3" at="br" />
          <AppGeo shape="cross" color="green" size="sm" :orbit="4" at="tl" />
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

          <div class="filters__block filters__status">
            <span class="m-label filters__label">
              状态
              <span v-if="activeStatusCount" class="m-badge m-badge--red filters__count m-mono">
                {{ activeStatusCount }}
              </span>
            </span>
            <div class="filters__chips">
              <button
                v-for="option in statusOptions"
                :key="option.value"
                class="m-chip filters__chip"
                :class="{ 'm-chip--active': filterStore.query.statuses.includes(option.value) }"
                type="button"
                :aria-pressed="filterStore.query.statuses.includes(option.value)"
                @click="filterStore.toggleStatus(option.value)"
              >
                <AppIcon :name="option.value === 'to_wash' ? 'alert' : 'check'" :size="14" :stroke-width="3" />
                <span>{{ option.label }}</span>
              </button>
            </div>
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
                v-if="filterStore.hasFilter"
                type="secondary"
                tone="red"
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
        empty-motif="hanger"
        @select="handleSelect"
        @favorite="handleFavorite"
      >
        <AppButton v-if="!filterStore.hasFilter" type="primary" tone="red" size="sm" icon="plus" @click="goCreate">
          添加第一件衣服
        </AppButton>
      </ClothingGrid>
    </div>

    <button class="fab" type="button" aria-label="添加衣服" @click="goCreate">
      <AppIcon name="plus" :size="28" :stroke-width="3.4" />
    </button>
  </div>
</template>

<style scoped>
/* ------------------------- 筛选控制台 ------------------------- */

.filters {
  --m-title-accent: var(--m-yellow);
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
  display: flex;
  align-items: center;
  gap: var(--m-2);
}

.filters__count {
  padding: 0 var(--m-2);
}

.filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
}

/* 状态芯片：选中态用撞色实心块，未选中时保持白底 */
.filters__chip {
  --m-chip-active: var(--m-red);
  min-height: 44px;
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

/* 平板起：控制台从「纵向堆叠」变成「不规则两列」 */
@media (min-width: 640px) {
  .filters__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'search search'
      'wardrobe status'
      'tools tools';
    gap: var(--m-5) var(--m-6);
  }

  .filters__search {
    grid-area: search;
  }

  .filters__wardrobe {
    grid-area: wardrobe;
  }

  .filters__status {
    grid-area: status;
  }

  .filters__tools {
    grid-area: tools;
  }
}

/* 桌面：控制台变成「搜索 / 衣柜 / 标签与排序」一行 + 「状态」一行 */
@media (min-width: 1024px) {
  .filters {
    margin-bottom: var(--m-8);
  }

  .filters__grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr);
    grid-template-areas:
      'search search search'
      'wardrobe tools status';
    gap: var(--m-6) var(--m-8);
  }
}

/* 超宽屏：控制台内部留白再加大 */
@media (min-width: 1440px) {
  .filters__grid {
    gap: var(--m-6) var(--m-10);
  }
}

/* ------------------------- 悬浮新增按钮 ------------------------- */

.fab {
  position: fixed;
  right: var(--m-4);
  bottom: calc(var(--m-nav-h) + var(--m-safe-b) + var(--m-4));
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-red);
  color: var(--m-on-accent);
  box-shadow: var(--m-shadow);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .fab:hover {
    background-color: var(--m-yellow);
    box-shadow: var(--m-shadow-hover);
  }
}

/* 玩具按键：按下完全贴地 */
.fab:active {
  transform: translate(5px, 5px);
  box-shadow: none;
}

/* 桌面端底部导航消失，按钮贴近底部；位置略向右让开内容列 */
@media (min-width: 1024px) {
  .fab {
    right: var(--m-8);
    bottom: var(--m-8);
  }
}
</style>
