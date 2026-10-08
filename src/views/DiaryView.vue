<!-- 穿搭日记（孟菲斯风格）：月历 + 点选某天看详情 + 编辑 / 删除，配统计与「很久没穿」。
     手机端单列（统计 → 日历 → 详情 → 很久没穿），≥1024px 时日历与详情占主列、统计与很久没穿落到 340px 侧列。 -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { Clothing } from '@/models';
import type { DiaryDetail } from '@/services';
import { useClothingStore, useDiaryStore } from '@/stores';
import { formatDate, formatRelativeDay, startOfDay } from '@/utils/date';

/** 日期方块的撞色循环（按「日号 + 月份」错开，逐月滚动，保持孟菲斯的撞色节奏） */
const DAY_TONES = ['red', 'yellow', 'cyan', 'pink', 'green'] as const;

/** 撞色名 */
type DayTone = (typeof DAY_TONES)[number];

/** 星期表头（周日为一周起始） */
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** 日历里的一天 */
interface CalendarDay {
  /** 唯一 key */
  key: string;
  /** 日号 */
  day: number;
  /** 当天 0 点时间戳 */
  timestamp: number;
  /** 这一天是否有记录 */
  recorded: boolean;
  /** 记录里关联的衣服件数（为 0 时改用一个小方块标记） */
  count: number;
  /** 是否是今天 */
  today: boolean;
  /** 是否是当前选中的日期 */
  selected: boolean;
  /** 撞色 */
  tone: DayTone;
  /** 无障碍标签（读屏用，同时说明是否有记录） */
  label: string;
}

/** 衣服 + 主图缩略图（详情衣服列表与「很久没穿」共用） */
interface ClothingWithThumb {
  /** 衣服本体 */
  clothing: Clothing;
  /** 主图缩略图地址（衣服列表里查不到或衣服没有图片时为 undefined） */
  thumbnailUrl?: string;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();
const diaryStore = useDiaryStore();
const clothingStore = useClothingStore();

/** 今天 0 点的时间戳（给「今天」加粗描边用） */
const todayStamp = startOfDay();
/** 日历当前展示的年份 */
const viewYear = ref(new Date().getFullYear());
/** 日历当前展示的月份（0 起） */
const viewMonth = ref(new Date().getMonth());
/** 当前选中的日期（当天 0 点时间戳），默认今天 */
const selectedDate = ref(todayStamp);
/** 选中日期的详情（含关联搭配与衣服） */
const detail = ref<DiaryDetail>();
/** 详情是否正在载入 */
const detailLoading = ref(false);

/** 详情请求序号：快速切日期时用它丢弃过期结果 */
let detailRequestId = 0;

/** 页头副标题 */
const headerSubtitle = computed(() => `共记录 ${diaryStore.total} 天`);

/** 月份标题，如「2026 年 10 月」 */
const monthTitle = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`);

/** 当月天数（0 起的月份 +1 后写 0 号，即下个月的前一天） */
const daysInMonth = computed(() => new Date(viewYear.value, viewMonth.value + 1, 0).getDate());

/** 1 号是星期几（0 = 周日），决定月初要补几个空位 */
const leadingCount = computed(() => new Date(viewYear.value, viewMonth.value, 1).getDay());

/** 月初空位对应的上个月日号（灰色占位，保证 1 号落在正确的星期列） */
const leadingDays = computed<number[]>(() => {
  const previousMonthTotal = new Date(viewYear.value, viewMonth.value, 0).getDate();
  const count = leadingCount.value;
  return Array.from({ length: count }, (_, index) => previousMonthTotal - count + index + 1);
});

/** 月末空位对应的下个月日号（补齐最后一行，让网格始终是 7 的整数倍） */
const trailingDays = computed<number[]>(() => {
  const remainder = (leadingCount.value + daysInMonth.value) % 7;
  if (!remainder) return [];
  return Array.from({ length: 7 - remainder }, (_, index) => index + 1);
});

/** 当月的每一天（循环生成，带上记录、今天、选中与撞色信息） */
const monthDays = computed<CalendarDay[]>(() => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const days: CalendarDay[] = [];

  for (let day = 1; day <= daysInMonth.value; day += 1) {
    const timestamp = new Date(year, month, day).getTime();
    const entry = diaryStore.findByDate(timestamp);
    const selected = timestamp === selectedDate.value;
    days.push({
      key: `day-${day}`,
      day,
      timestamp,
      recorded: Boolean(entry),
      count: entry ? entry.clothingIds.length : 0,
      today: timestamp === todayStamp,
      selected,
      tone: DAY_TONES[(day - 1 + month) % DAY_TONES.length],
      label: `${month + 1} 月 ${day} 日，${entry ? '有记录' : '没有记录'}${selected ? '，已选中' : ''}`
    });
  }

  return days;
});

/** 当前选中日期对应的记录（没有则是空态） */
const selectedEntry = computed(() => diaryStore.findByDate(selectedDate.value));

/** 「很久没穿」列表（补上缩略图地址） */
const longUnwornItems = computed<ClothingWithThumb[]>(() =>
  diaryStore.longUnworn.map((clothing) => ({
    clothing,
    thumbnailUrl: clothingStore.findItem(clothing.id)?.thumbnailUrl
  }))
);

/** 选中日期详情里的衣服（补上缩略图地址；已被删除的衣服 service 已经过滤掉） */
const detailClothes = computed<ClothingWithThumb[]>(() =>
  (detail.value?.clothes ?? []).map((clothing) => ({
    clothing,
    thumbnailUrl: clothingStore.findItem(clothing.id)?.thumbnailUrl
  }))
);

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '操作失败，请稍后重试';
}

/**
 * 载入某条日记的详情。
 * @param id 日记 id
 */
async function loadDetail(id: string): Promise<void> {
  const requestId = (detailRequestId += 1);
  detailLoading.value = true;
  try {
    const result = await diaryStore.getDetail(id);
    if (requestId !== detailRequestId) return;
    detail.value = result;
  } catch (error) {
    if (requestId === detailRequestId) detail.value = undefined;
    toast.error(toErrorMessage(error));
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false;
  }
}

/** 选中某一天（日历格子点击） */
function selectDay(timestamp: number): void {
  selectedDate.value = timestamp;
}

/**
 * 切换月份。
 * @param delta 偏移量，-1 上一月、1 下一月
 */
function shiftMonth(delta: number): void {
  const target = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = target.getFullYear();
  viewMonth.value = target.getMonth();
}

/** 回到今天（同时选中今天） */
function goToday(): void {
  const now = new Date();
  viewYear.value = now.getFullYear();
  viewMonth.value = now.getMonth();
  selectedDate.value = startOfDay(now.getTime());
}

/** 跳到上一月 */
function goPreviousMonth(): void {
  shiftMonth(-1);
}

/** 跳到下一月 */
function goNextMonth(): void {
  shiftMonth(1);
}

/** 跳到新增日记页（默认今天） */
async function goCreate(): Promise<void> {
  try {
    await router.push({ name: 'diary-new' });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 跳到新增日记页并带上当前选中的日期 */
async function goCreateForSelectedDay(): Promise<void> {
  try {
    await router.push({ name: 'diary-new', query: { date: String(selectedDate.value) } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 跳到编辑页，编辑当前选中这一天的记录 */
async function goEditSelectedDay(): Promise<void> {
  try {
    await router.push({ name: 'diary-edit', params: { date: String(selectedDate.value) } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/**
 * 跳到衣服详情。
 * @param id 衣服 id
 */
async function goClothingDetail(id: string): Promise<void> {
  try {
    await router.push({ name: 'clothing-detail', params: { id } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/**
 * 跳到搭配详情。
 * @param id 搭配 id
 */
async function goOutfitDetail(id: string): Promise<void> {
  try {
    await router.push({ name: 'outfit-detail', params: { id } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 删除当前选中这一天的记录（先二次确认，删除会回退该天的穿着次数） */
async function handleRemove(): Promise<void> {
  const entry = selectedEntry.value;
  if (!entry) return;

  try {
    const accepted = await confirmDialog.confirm({
      title: '删除记录',
      message: `确定删除 ${formatDate(entry.date)} 的记录吗？这天的穿着次数会一并回退。`,
      confirmText: '删除',
      danger: true
    });
    if (!accepted) return;

    await diaryStore.remove(entry.id);
    detail.value = undefined;
    toast.success('已删除这天的记录');
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 读取路由 query 里的日期（保存后跳回日历时会带上），定位到那一天 */
function syncSelectionFromRoute(): void {
  const raw = route.query.date;
  const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return;

  const date = startOfDay(parsed);
  selectedDate.value = date;
  viewYear.value = new Date(date).getFullYear();
  viewMonth.value = new Date(date).getMonth();
}

// 记录更新后重新取详情；只看 id，避免详情里的其它字段变化引起重复请求
watch(
  () => selectedEntry.value?.id,
  async (id) => {
    if (!id) {
      detail.value = undefined;
      return;
    }
    await loadDetail(id);
  },
  { immediate: true }
);

// 从编辑页返回时 query 变化，需要重新定位日历
watch(
  () => route.query.date,
  () => {
    syncSelectionFromRoute();
  }
);

onMounted(async () => {
  try {
    // 「很久没穿」的缩略图来自衣服列表，所以这里顺带保证衣服列表已加载
    await Promise.all([
      diaryStore.load(),
      clothingStore.loaded ? Promise.resolve() : clothingStore.load()
    ]);
    syncSelectionFromRoute();
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
});
</script>

<template>
  <div class="page page--with-header diary-view">
    <PageHeader title="穿搭日记" :subtitle="headerSubtitle" tone="green">
      <AppButton type="primary" tone="red" size="md" icon="plus" @click="goCreate">记录</AppButton>
    </PageHeader>

    <div class="page__body diary-view__body">
      <div class="diary-view__grid">
        <!-- 统计：两个撞色条，数字用等宽字 -->
        <section class="diary-view__stats" aria-label="记录统计">
          <div class="m-strip diary-view__stat diary-view__stat--days">
            <span class="diary-view__stat-value m-mono">{{ diaryStore.total }}</span>
            <span class="diary-view__stat-label">共记录天数</span>
          </div>
          <div class="m-strip diary-view__stat diary-view__stat--unworn">
            <span class="diary-view__stat-value m-mono">{{ longUnwornItems.length }}</span>
            <span class="diary-view__stat-label">很久没穿</span>
          </div>
        </section>

        <!-- 日历 -->
        <section class="diary-view__calendar m-card m-card--pad" aria-label="穿搭日历">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="ring" color="cyan" size="md" :orbit="2" at="tr" />
          </div>

          <h2 class="m-section-title diary-view__title diary-view__title--cyan">穿搭日历</h2>

          <div class="diary-view__calendar-head">
            <button class="diary-view__nav" type="button" aria-label="上一月" @click="goPreviousMonth">
              <AppIcon name="chevron-left" :size="18" :stroke-width="3" />
            </button>
            <p class="diary-view__month m-mono" aria-live="polite">{{ monthTitle }}</p>
            <button class="diary-view__nav" type="button" aria-label="下一月" @click="goNextMonth">
              <AppIcon name="chevron-right" :size="18" :stroke-width="3" />
            </button>
            <AppButton type="secondary" tone="cyan" size="sm" @click="goToday">今天</AppButton>
          </div>

          <div class="diary-view__weekdays" aria-hidden="true">
            <span v-for="label in WEEKDAY_LABELS" :key="label" class="diary-view__weekday">{{ label }}</span>
          </div>

          <div class="diary-view__days" role="group" aria-label="按天选择日期">
            <span
              v-for="day in leadingDays"
              :key="`lead-${day}`"
              class="diary-view__day diary-view__day--outside m-mono"
              aria-hidden="true"
            >
              <span class="diary-view__day-num">{{ day }}</span>
              <span class="diary-view__day-foot" />
            </span>

            <button
              v-for="cell in monthDays"
              :key="cell.key"
              class="diary-view__day"
              :class="[
                `diary-view__day--t-${cell.tone}`,
                {
                  'diary-view__day--recorded': cell.recorded,
                  'diary-view__day--today': cell.today,
                  'diary-view__day--selected': cell.selected
                }
              ]"
              type="button"
              :aria-pressed="cell.selected"
              :aria-label="cell.label"
              @click="selectDay(cell.timestamp)"
            >
              <span class="diary-view__day-num m-mono">{{ cell.day }}</span>

              <!-- 底部指示行：对勾（选中） / 件数 / 方块标记，固定高度让所有格子对齐 -->
              <span class="diary-view__day-foot">
                <span v-if="cell.selected" class="diary-view__day-check" aria-hidden="true">
                  <AppIcon name="check" :size="10" :stroke-width="4" />
                </span>
                <span v-else-if="cell.recorded && cell.count" class="diary-view__day-count m-mono">
                  {{ cell.count }}
                </span>
                <span v-else-if="cell.recorded" class="diary-view__day-mark" aria-hidden="true" />
              </span>
            </button>

            <span
              v-for="day in trailingDays"
              :key="`tail-${day}`"
              class="diary-view__day diary-view__day--outside m-mono"
              aria-hidden="true"
            >
              <span class="diary-view__day-num">{{ day }}</span>
              <span class="diary-view__day-foot" />
            </span>
          </div>
        </section>

        <!-- 详情 -->
        <section class="diary-view__detail m-card m-card--pad" aria-label="当天的记录">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="half" color="ink" size="sm" :orbit="3" at="bl" />
          </div>

          <h2 class="m-section-title diary-view__title diary-view__title--green">
            {{ formatDate(selectedDate) }}
          </h2>

          <template v-if="selectedEntry">
            <div class="diary-view__detail-badges">
              <span v-if="selectedEntry.weather" class="m-badge m-badge--cyan">
                {{ selectedEntry.weather }}
              </span>
              <span v-if="selectedEntry.occasion" class="m-badge m-badge--yellow">
                {{ selectedEntry.occasion }}
              </span>
              <span class="m-badge m-badge--pink">{{ selectedEntry.clothingIds.length }} 件衣服</span>
            </div>

            <p v-if="selectedEntry.note" class="diary-view__note">{{ selectedEntry.note }}</p>

            <p v-if="detailLoading" class="m-caption diary-view__loading">正在载入这一天的详情…</p>

            <template v-else-if="detail">
              <div v-if="detail.outfit" class="diary-view__outfit">
                <span class="m-fact__label">关联搭配</span>
                <button
                  class="diary-view__outfit-link"
                  type="button"
                  @click="goOutfitDetail(detail.outfit.id)"
                >
                  <AppIcon name="layers" :size="16" :stroke-width="2.6" />
                  <span class="ellipsis">{{ detail.outfit.name }}</span>
                </button>
              </div>

              <ul v-if="detailClothes.length" class="diary-view__clothes">
                <li v-for="item in detailClothes" :key="item.clothing.id">
                  <button
                    class="diary-view__clothing"
                    type="button"
                    @click="goClothingDetail(item.clothing.id)"
                  >
                    <img
                      v-if="item.thumbnailUrl"
                      class="diary-view__clothing-thumb"
                      :src="item.thumbnailUrl"
                      :alt="item.clothing.name"
                      loading="lazy"
                    />
                    <span
                      v-else
                      class="diary-view__clothing-thumb diary-view__clothing-thumb--empty"
                      aria-hidden="true"
                    >
                      <AppIcon name="hanger" :size="20" :stroke-width="2.2" />
                    </span>

                    <span class="diary-view__clothing-name ellipsis">{{ item.clothing.name }}</span>
                  </button>
                </li>
              </ul>

              <p v-else class="m-caption">这一天没有单独关联衣服。</p>
            </template>

            <div class="diary-view__detail-actions">
              <AppButton
                type="secondary"
                tone="cyan"
                size="md"
                icon="pencil"
                @click="goEditSelectedDay"
              >
                编辑这一天的记录
              </AppButton>
              <AppButton type="danger" size="md" icon="trash" @click="handleRemove">删除</AppButton>
            </div>
          </template>

          <AppEmpty
            v-else
            motif="calendar"
            title="这天还没有记录"
            description="把这一天的穿搭记下来，日历上就会多出一个撞色方块"
          >
            <AppButton type="primary" tone="green" size="md" icon="plus" @click="goCreateForSelectedDay">
              记录这一天
            </AppButton>
          </AppEmpty>
        </section>

        <!-- 「很久没穿」：为空时整块隐藏 -->
        <section v-if="longUnwornItems.length" class="diary-view__unworn" aria-label="很久没穿">
          <h2 class="m-section-title diary-view__title diary-view__title--red">很久没穿</h2>
          <p class="m-caption">超过 30 天没穿过的衣服，点一件看看要不要重新搭配。</p>

          <ul class="diary-view__unworn-list">
            <li v-for="item in longUnwornItems" :key="item.clothing.id">
              <button
                class="diary-view__unworn-item"
                type="button"
                @click="goClothingDetail(item.clothing.id)"
              >
                <img
                  v-if="item.thumbnailUrl"
                  class="diary-view__unworn-thumb"
                  :src="item.thumbnailUrl"
                  :alt="item.clothing.name"
                  loading="lazy"
                />
                <span
                  v-else
                  class="diary-view__unworn-thumb diary-view__unworn-thumb--empty"
                  aria-hidden="true"
                >
                  <AppIcon name="hanger" :size="22" :stroke-width="2.2" />
                </span>

                <span class="diary-view__unworn-body">
                  <span class="diary-view__unworn-name ellipsis">{{ item.clothing.name }}</span>
                  <span class="m-caption">{{ formatRelativeDay(item.clothing.lastWornAt) }}</span>
                </span>
              </button>
            </li>
          </ul>
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

/* 网格区域：手机单列，桌面把统计与「很久没穿」挪到右列 */
.diary-view__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'stats'
    'calendar'
    'detail'
    'unworn';
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

.diary-view__title--red {
  --m-title-accent: var(--m-red);
}

/* ------------------------- 统计 ------------------------- */

.diary-view__stats {
  grid-area: stats;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--m-3);
}

.diary-view__stat {
  justify-content: space-between;
  gap: var(--m-2);
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

/* ------------------------- 日历 ------------------------- */

.diary-view__calendar {
  grid-area: calendar;
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.diary-view__calendar-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--m-2);
}

/* 月份切换：44px 触摸目标 + 图标按钮 */
.diary-view__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__nav:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-view__nav:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.diary-view__month {
  flex: 1;
  min-width: 0;
  font-size: var(--m-fs-body);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.diary-view__weekdays {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--m-1);
}

.diary-view__weekday {
  text-align: center;
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  color: var(--m-text-muted);
}

.diary-view__days {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--m-1);
}

/* 单个日期格子：44px 触摸目标，撞色由 --m-day-bg 驱动 */
.diary-view__day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--m-1);
  min-height: 44px;
  padding: var(--m-1);
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-surface);
  color: var(--m-text);
  transition: var(--m-transition);
}

/* 上下月的占位日期：只留灰字，不做成交互元素 */
.diary-view__day--outside {
  border-color: transparent;
  background-color: transparent;
  color: var(--m-text-muted);
  opacity: 0.55;
}

.diary-view__day--t-red {
  --m-day-bg: var(--m-red);
}

.diary-view__day--t-yellow {
  --m-day-bg: var(--m-yellow);
}

.diary-view__day--t-cyan {
  --m-day-bg: var(--m-cyan);
}

.diary-view__day--t-pink {
  --m-day-bg: var(--m-pink);
}

.diary-view__day--t-green {
  --m-day-bg: var(--m-green);
}

/* 有记录：填充撞色 + 件数 */
.diary-view__day--recorded {
  background-color: var(--m-day-bg);
  color: var(--m-on-accent);
}

/* 今天：加粗描边（形状差异，不只靠颜色） */
.diary-view__day--today {
  border-width: var(--m-bw-thick);
}

/* 选中：实心撞色 + 硬阴影 + 底部对勾（配合 aria-pressed，不只靠颜色） */
.diary-view__day--selected {
  background-color: var(--m-day-bg);
  color: var(--m-on-accent);
  border-width: var(--m-bw-thick);
  box-shadow: var(--m-shadow-sm);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__day:not(.diary-view__day--outside):not(.diary-view__day--selected):hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-xs);
  }
}

.diary-view__day:active:not(.diary-view__day--outside) {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.diary-view__day-num {
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
  line-height: 1;
}

/* 底部指示行：固定高度，保证所有格子里的数字纵向对齐 */
.diary-view__day-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 14px;
}

.diary-view__day-count {
  font-size: 10px;
  font-weight: var(--m-weight-black);
  line-height: 1;
  opacity: 0.85;
}

/* 只关联搭配、没有单独衣服时的标记 */
.diary-view__day-mark {
  width: 6px;
  height: 6px;
  background-color: currentColor;
}

/* 选中标记：墨色小块里的对勾（形状差异，不只靠颜色） */
.diary-view__day-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background-color: var(--m-ink);
  color: var(--m-on-ink);
}

/* ------------------------- 详情 ------------------------- */

.diary-view__detail {
  grid-area: detail;
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.diary-view__detail-badges {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
}

.diary-view__note {
  position: relative;
  z-index: 1;
  font-size: var(--m-fs-sm);
  color: var(--m-text-soft);
  line-height: 1.7;
}

.diary-view__loading {
  position: relative;
  z-index: 1;
}

.diary-view__outfit {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--m-3);
  flex-wrap: wrap;
}

.diary-view__outfit-link {
  display: inline-flex;
  align-items: center;
  gap: var(--m-2);
  max-width: 100%;
  min-height: 38px;
  padding: var(--m-2) var(--m-4);
  border: var(--m-line);
  border-radius: var(--m-radius-pill);
  background-color: var(--m-cyan);
  color: var(--m-on-accent);
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__outfit-link:hover {
    background-color: var(--m-yellow);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-view__outfit-link:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.diary-view__clothes {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: var(--m-3);
}

.diary-view__clothing {
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  width: 100%;
  padding: var(--m-2);
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  text-align: left;
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__clothing:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-view__clothing:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.diary-view__clothing-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-bottom: var(--m-line);
  background-color: var(--m-surface-2);
}

.diary-view__clothing-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--m-line);
  color: var(--m-text-muted);
}

.diary-view__clothing-name {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  line-height: 1.3;
}

.diary-view__detail-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-3);
  margin-top: var(--m-1);
}

/* ------------------------- 很久没穿 ------------------------- */

.diary-view__unworn {
  grid-area: unworn;
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
}

/* 卡片里的装饰画放在内容之上，保证小几何图形不被图片盖住 */
.diary-view__unworn-list {
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
}

.diary-view__unworn-item {
  display: flex;
  align-items: center;
  gap: var(--m-3);
  width: 100%;
  padding: var(--m-2);
  border: var(--m-line);
  border-radius: var(--m-radius);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  text-align: left;
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .diary-view__unworn-item:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-view__unworn-item:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.diary-view__unworn-thumb {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  object-fit: cover;
  border: var(--m-line);
  background-color: var(--m-surface-2);
}

.diary-view__unworn-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--m-text-muted);
}

.diary-view__unworn-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.diary-view__unworn-name {
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
}

/* ------------------------- 断点 ------------------------- */

/* 大屏手机 / 小平板：格子与月份标题都放大一档 */
@media (min-width: 640px) {
  .diary-view__days,
  .diary-view__weekdays {
    gap: var(--m-2);
  }

  .diary-view__day {
    min-height: 52px;
  }

  .diary-view__month {
    font-size: var(--m-fs-h3);
  }

  .diary-view__day-num {
    font-size: var(--m-fs-body);
  }
}

@media (min-width: 700px) {
  .diary-view__clothes {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  }
}

/* 桌面：日历 + 详情占主列，统计 + 很久没穿落到 340px 侧列 */
@media (min-width: 1024px) {
  .diary-view__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
    grid-template-areas:
      'calendar stats'
      'detail unworn';
    gap: var(--m-6) var(--m-7);
  }

  .diary-view__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .diary-view__day {
    min-height: 58px;
  }
}

/* 宽屏：格子再高一点，网格更好点 */
@media (min-width: 1440px) {
  .diary-view__day {
    min-height: 64px;
  }

  .diary-view__days {
    gap: var(--m-3);
  }
}
</style>
