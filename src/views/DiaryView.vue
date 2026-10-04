<!-- 穿搭日记（孟菲斯风格）：统计撞色块 + 日记列表 + 「很久没穿」横滑区。
     手机端单列（统计、列表、很久没穿依次排列），桌面端（≥1024px）列表占主列、统计与很久没穿落到侧列。 -->
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { Clothing, DiaryEntry } from '@/models';
import { useClothingStore, useDiaryStore } from '@/stores';
import { formatDate, formatRelativeDay } from '@/utils/date';

/** 「很久没穿」条目：衣服本体 + 主图缩略图 */
interface LongUnwornItem {
  /** 衣服本体 */
  clothing: Clothing;
  /** 主图缩略图地址（衣服列表里查不到时为 undefined） */
  thumbnailUrl?: string;
}

/** 日期方块的撞色循环（按列表顺序错开，保持孟菲斯的撞色节奏） */
const DATE_TONES = ['red', 'yellow', 'cyan', 'pink', 'green'] as const;

const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();
const diaryStore = useDiaryStore();
const clothingStore = useClothingStore();

/** 「很久没穿」列表（补上缩略图地址） */
const longUnwornItems = computed<LongUnwornItem[]>(() =>
  diaryStore.longUnworn.map((clothing) => ({
    clothing,
    thumbnailUrl: clothingStore.findItem(clothing.id)?.thumbnailUrl
  }))
);

/** 每条日记的日期拆成「年-月」与「日」两段，方便排成日历格子 */
const dateCells = computed(() =>
  diaryStore.list.map((entry) => {
    const text = formatDate(entry.date);
    return { head: text.slice(0, 7), day: text.slice(8) };
  })
);

/**
 * 取第 index 条日记的日期方块撞色类名。
 * @param index 列表下标
 * @returns 撞色类名
 */
function dateToneClass(index: number): string {
  return `diary-view__date--${DATE_TONES[index % DATE_TONES.length]}`;
}

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '操作失败，请稍后重试';
}

/**
 * 某条日记的来源文案。
 * @param entry 日记
 * @returns 关联了搭配时返回「来自搭配」，否则返回衣服件数
 */
function entrySourceLabel(entry: DiaryEntry): string {
  return entry.outfitId ? '来自搭配' : `${entry.clothingIds.length} 件衣服`;
}

/** 跳转到新增日记页 */
async function goCreate(): Promise<void> {
  try {
    await router.push({ name: 'diary-new' });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/**
 * 删除一条日记（先二次确认，删除会回退该天的穿着次数）。
 * @param entry 待删除的日记
 */
async function handleRemove(entry: DiaryEntry): Promise<void> {
  try {
    const accepted = await confirmDialog.confirm({
      title: '删除日记',
      message: `确定删除 ${formatDate(entry.date)} 的记录吗？这天的穿着次数会一并回退。`,
      confirmText: '删除',
      danger: true
    });
    if (!accepted) return;

    await diaryStore.remove(entry.id);
    toast.success('已删除');
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

// TODO(第二阶段)：日历视图——月历上标记已记录的日期，点日期直接新增/编辑当天日记。
// TODO(第二阶段)：统计图表（穿着次数趋势、最常穿的衣服），数据层已在 diaryService 里实现。
// TODO(第二阶段)：把「很久没穿」做成独立入口页面（带筛选 + 一键记一笔）。
// TODO(第二阶段)：日记条目支持点击进入编辑（需要 diary/:id 路由，目前只有 diary-new）。

onMounted(async () => {
  try {
    // 「很久没穿」的缩略图来自衣服列表，所以这里顺带保证衣服列表已加载
    await Promise.all([
      clothingStore.loaded ? Promise.resolve() : clothingStore.load(),
      diaryStore.load()
    ]);
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
});
</script>

<template>
  <div class="page page--with-header diary-view">
    <PageHeader title="穿搭日记" tone="green">
      <AppButton type="primary" tone="red" size="md" icon="plus" @click="goCreate">记录</AppButton>
    </PageHeader>

    <div class="page__body diary-view__body">
      <p class="m-caption">
        第一阶段为只读预览，日历视图、自动累加穿着次数在第二阶段完成。
      </p>

      <div class="diary-view__grid">
        <!-- 统计：两个撞色条，数字用等宽字（几何装饰在 .m-card 内，hover 会漂移） -->
        <section class="diary-view__stats m-card m-card--pad" aria-label="记录统计">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="circle" color="green" size="lg" :orbit="1" at="tr" />
            <AppGeo shape="cross" color="cyan" size="sm" :orbit="4" at="br" />
          </div>

          <h2 class="m-section-title diary-view__title">记录统计</h2>

          <div class="diary-view__stat-list">
            <div class="m-strip diary-view__stat diary-view__stat--days">
              <span class="diary-view__stat-value m-mono">{{ diaryStore.total }}</span>
              <span class="diary-view__stat-label">共记录天数</span>
            </div>
            <div class="m-strip diary-view__stat diary-view__stat--unworn">
              <span class="diary-view__stat-value m-mono">{{ longUnwornItems.length }}</span>
              <span class="diary-view__stat-label">很久没穿</span>
            </div>
          </div>
        </section>

        <!-- 日记列表 -->
        <section class="diary-view__list-section">
          <h2 class="m-section-title diary-view__title diary-view__title--cyan">全部记录</h2>

          <ul v-if="diaryStore.list.length" class="diary-view__list">
            <li v-for="(entry, index) in diaryStore.list" :key="entry.id" class="diary-view__item m-card">
              <div class="m-geo-layer diary-view__geo" aria-hidden="true">
                <AppGeo shape="half" color="ink" size="sm" :orbit="2" at="bl" />
              </div>

              <div class="diary-view__date" :class="dateToneClass(index)">
                <span class="diary-view__date-head m-mono">{{ dateCells[index]?.head }}</span>
                <span class="diary-view__date-day m-mono">{{ dateCells[index]?.day }}</span>
              </div>

              <div class="diary-view__item-body">
                <p class="diary-view__tags">
                  <span v-if="entry.weather" class="m-badge m-badge--cyan">{{ entry.weather }}</span>
                  <span v-if="entry.occasion" class="m-badge m-badge--yellow">{{ entry.occasion }}</span>
                  <span class="m-badge m-badge--pink">{{ entrySourceLabel(entry) }}</span>
                </p>
                <p v-if="entry.note" class="diary-view__note ellipsis-2">{{ entry.note }}</p>
              </div>

              <button
                class="diary-view__remove"
                type="button"
                :aria-label="`删除 ${formatDate(entry.date)} 的记录`"
                @click="handleRemove(entry)"
              >
                <AppIcon name="trash" :size="18" :stroke-width="2.6" />
              </button>
            </li>
          </ul>

          <AppEmpty
            v-else-if="!diaryStore.loading"
            motif="calendar"
            title="还没有记录"
            description="点右上角「记录」写下今天的穿搭；日历视图与自动统计在第二阶段上线"
          >
            <AppButton type="secondary" tone="red" size="md" icon="plus" @click="goCreate">
              记录今天
            </AppButton>
          </AppEmpty>

          <p v-else class="m-caption">正在载入日记…</p>
        </section>

        <!-- 「很久没穿」简表：为空时整块隐藏 -->
        <section v-if="longUnwornItems.length" class="diary-view__unworn">
          <h2 class="m-section-title diary-view__title diary-view__title--green">很久没穿</h2>
          <p class="m-caption">超过 30 天没穿过的衣服，第二阶段会做成独立入口。</p>

          <div class="diary-view__unworn-list scroll-x">
            <div
              v-for="item in longUnwornItems"
              :key="item.clothing.id"
              class="diary-view__unworn-card m-card"
            >
              <div class="m-geo-layer diary-view__geo" aria-hidden="true">
                <AppGeo shape="square" color="pink" size="xs" :orbit="3" at="tr" />
              </div>

              <img
                v-if="item.thumbnailUrl"
                class="diary-view__unworn-thumb"
                :src="item.thumbnailUrl"
                :alt="item.clothing.name"
              />
              <span
                v-else
                class="diary-view__unworn-thumb diary-view__unworn-thumb--empty"
                aria-hidden="true"
              >
                <AppIcon name="hanger" :size="24" :stroke-width="2.2" />
              </span>

              <span class="diary-view__unworn-name ellipsis">{{ item.clothing.name }}</span>
              <span class="m-caption diary-view__unworn-meta">
                {{ formatRelativeDay(item.clothing.lastWornAt) }}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-view__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.diary-view__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-5);
  align-items: start;
}

/* 分区标题：每块换一种撞色方块 */
.diary-view__title {
  --m-title-accent: var(--m-yellow);
}

.diary-view__title--cyan {
  --m-title-accent: var(--m-cyan);
}

.diary-view__title--green {
  --m-title-accent: var(--m-green);
}

.diary-view__list-section,
.diary-view__unworn {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

/* 列表行与「很久没穿」卡片里的装饰画在内容之上，保证小几何图形不被图片/色块盖住 */
.diary-view__geo {
  z-index: 2;
}

/* ------------------------- 统计 ------------------------- */

.diary-view__stat-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
  margin-top: var(--m-4);
}

.diary-view__stat {
  justify-content: space-between;
  gap: var(--m-3);
  padding: var(--m-3);
}

.diary-view__stat--days {
  --m-strip-color: var(--m-cyan);
}

.diary-view__stat--unworn {
  --m-strip-color: var(--m-pink);
}

.diary-view__stat-value {
  font-size: var(--m-fs-h2);
  font-weight: var(--m-weight-black);
  line-height: 1;
}

.diary-view__stat-label {
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
}

/* ------------------------- 日记列表 ------------------------- */

.diary-view__list {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.diary-view__item {
  display: flex;
  align-items: center;
  gap: var(--m-3);
  padding: var(--m-3);
}

.diary-view__item-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

/* 日期：像日历格子的撞色方块，等宽字保证纵向对齐 */
.diary-view__date {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 68px;
  min-height: 66px;
  padding: var(--m-2);
  border: var(--m-line);
  color: var(--m-on-accent);
  box-shadow: var(--m-shadow-xs);
}

.diary-view__date--red {
  background-color: var(--m-red);
}

.diary-view__date--yellow {
  background-color: var(--m-yellow);
}

.diary-view__date--cyan {
  background-color: var(--m-cyan);
}

.diary-view__date--pink {
  background-color: var(--m-pink);
}

.diary-view__date--green {
  background-color: var(--m-green);
}

.diary-view__date-head {
  font-size: 11px;
  font-weight: var(--m-weight-bold);
  line-height: 1.2;
}

.diary-view__date-day {
  font-size: var(--m-fs-h2);
  font-weight: var(--m-weight-black);
  line-height: 1;
}

.diary-view__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
}

.diary-view__note {
  margin-top: var(--m-2);
  font-size: var(--m-fs-sm);
  color: var(--m-text-soft);
}

/* 删除：44px 触摸目标 + 图标按钮，带可访问名称 */
.diary-view__remove {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__remove:hover {
    background-color: var(--m-red);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-view__remove:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

/* ------------------------- 很久没穿 ------------------------- */

.diary-view__unworn-list {
  gap: var(--m-3);
  padding: var(--m-1) var(--m-6) var(--m-6) var(--m-1);
}

.diary-view__unworn-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  width: 108px;
  padding: var(--m-2);
  scroll-snap-align: start;
}

.diary-view__unworn-thumb {
  position: relative;
  z-index: 1;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-bottom: var(--m-line);
  background-color: var(--m-surface-2);
}

.diary-view__unworn-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--m-text-muted);
}

.diary-view__unworn-name {
  position: relative;
  z-index: 1;
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  color: var(--m-text);
}

.diary-view__unworn-meta {
  position: relative;
  z-index: 1;
}

/* ------------------------- 断点 ------------------------- */

@media (min-width: 700px) {
  .diary-view__item {
    gap: var(--m-4);
    padding: var(--m-4);
  }

  .diary-view__date {
    width: 78px;
    min-height: 72px;
  }
}

/* 桌面：列表占主列，统计 + 很久没穿落到 320px 侧列 */
@media (min-width: 1024px) {
  .diary-view__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
    grid-template-areas:
      'list stats'
      'list unworn';
    gap: var(--m-7);
  }

  .diary-view__list-section {
    grid-area: list;
  }

  .diary-view__stats {
    grid-area: stats;
  }

  .diary-view__unworn {
    grid-area: unworn;
  }

  .diary-view__list {
    gap: var(--m-5);
  }
}
</style>
