<!-- 日记新增 / 编辑（孟菲斯风格）：日期 / 天气 / 场合 / 备注 + 关联搭配 + 衣服多选。
     选定搭配会自动把搭配里的衣服合并进已选；手机端「取消 / 保存」固定在底部导航之上，≥700px 改成普通按钮行。 -->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import AppTextarea from '@/components/base/AppTextarea.vue';
import type { SelectOption } from '@/components/base/types';
import PageHeader from '@/components/business/PageHeader.vue';
import { useToast } from '@/composables/useToast';
import type { DiaryEntry } from '@/models';
import { outfitService, type DiaryDraft } from '@/services';
import { useClothingStore, useDiaryStore, useOutfitStore } from '@/stores';
import { formatDate, fromDateInputValue, startOfDay, toDateInputValue } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const clothingStore = useClothingStore();
const outfitStore = useOutfitStore();
const diaryStore = useDiaryStore();

/** 是否是编辑已有记录（否则是新增） */
const isEditMode = computed(() => route.name === 'diary-edit');

/**
 * 解析初始日期：编辑模式取路由参数（当天 0 点毫秒时间戳），
 * 新增模式取 query 上的日期，都没有时用今天。
 * @returns 当天 0 点的毫秒时间戳
 */
function resolveInitialDate(): number {
  const raw = isEditMode.value ? route.params.date : route.query.date;
  const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) return startOfDay(parsed);
  return startOfDay();
}

/** 穿着日期（YYYY-MM-DD，配合 AppInput 的 date 类型） */
const dateValue = ref(toDateInputValue(resolveInitialDate()));
/** 天气 */
const weather = ref('');
/** 场合 */
const occasion = ref('');
/** 备注 */
const note = ref('');
/** 本次记录选中的衣服 id 列表 */
const selectedClothingIds = ref<string[]>([]);
/** 关联的搭配 id（空串表示不关联搭配） */
const outfitId = ref('');
/** 正在编辑的记录 id（新增模式为空串，用于判断改日期会不会覆盖自己） */
const editingEntryId = ref('');
/** 是否正在保存 */
const saving = ref(false);
/** 表单是否已完成初始化（初始化前不显示「会覆盖」的提示，避免闪一下） */
const formReady = ref(false);
/** 回填表单期间置为 true，避免刚进页面就触发「选搭配自动带衣服」的提示 */
const hydrating = ref(false);

/** 关联搭配的下拉选项（第一项固定为「不关联搭配」空选项） */
const outfitOptions = computed<SelectOption[]>(() => [
  { value: '', label: '不关联搭配' },
  ...outfitStore.list.map((outfit) => ({ value: outfit.id, label: outfit.name }))
]);

/** 页头标题：编辑态与新增态用不同文案 */
const headerTitle = computed(() => (isEditMode.value ? '编辑记录' : '记录穿搭'));

/** 页头副标题：跟着日期输入实时变化 */
const headerSubtitle = computed(() => formatDate(fromDateInputValue(dateValue.value)));

/** 日期为空时的错误提示 */
const dateError = computed(() => (dateValue.value ? '' : '请选择日期'));

/** 日期输入框的辅助说明（编辑模式下提醒改日期等于挪动这条记录） */
const dateHint = computed(() => (isEditMode.value ? '改日期等于把这条记录挪到另一天' : ''));

/**
 * 表单里的日期已经存在别的记录（保存会覆盖那一天）。
 * 依赖已加载的日记列表，因此进页面时会把日记一并载入。
 */
const conflictEntry = computed<DiaryEntry | undefined>(() => {
  if (!formReady.value || !dateValue.value) return undefined;
  const existing = diaryStore.findByDate(fromDateInputValue(dateValue.value));
  if (!existing || existing.id === editingEntryId.value) return undefined;
  return existing;
});

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '操作失败，请稍后重试';
}

/**
 * 判断某件衣服是否已选中。
 * @param clothingId 衣服 id
 * @returns 选中时返回 true
 */
function isSelected(clothingId: string): boolean {
  return selectedClothingIds.value.includes(clothingId);
}

/**
 * 点击衣服方块：切换选中状态。
 * @param clothingId 衣服 id
 */
function toggleClothing(clothingId: string): void {
  const index = selectedClothingIds.value.indexOf(clothingId);
  if (index >= 0) selectedClothingIds.value.splice(index, 1);
  else selectedClothingIds.value.push(clothingId);
}

/**
 * 读取路由参数对应的已有记录（编辑模式专用）。
 * @returns 已存在的记录；参数无效或当天没有记录时返回 undefined
 */
function resolveEditingEntry(): DiaryEntry | undefined {
  const raw = route.params.date;
  const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return diaryStore.findByDate(startOfDay(parsed));
}

/**
 * 编辑模式：把已有记录回填到表单。
 * 已被删除的衣服不再回填，避免保存时留下找不到的引用。
 */
async function applyExistingEntry(): Promise<void> {
  const entry = resolveEditingEntry();
  if (!entry) {
    toast.error('没有找到这一天的记录，可以直接补记');
    return;
  }

  try {
    hydrating.value = true;
    editingEntryId.value = entry.id;
    dateValue.value = toDateInputValue(entry.date);
    weather.value = entry.weather ?? '';
    occasion.value = entry.occasion ?? '';
    note.value = entry.note ?? '';
    outfitId.value = entry.outfitId ?? '';
    selectedClothingIds.value = entry.clothingIds.filter((id) => Boolean(clothingStore.findItem(id)));

    // 等这一轮 watch 跑完再解除静默，否则回填 outfitId 会弹一次自动带衣服的提示
    await nextTick();
  } catch (error) {
    toast.error(toErrorMessage(error));
  } finally {
    hydrating.value = false;
  }
}

/**
 * 把选中搭配里的衣服合并进已选（只做合并，不自动移除用户手动选的）。
 * @param id 搭配 id，空串表示不关联搭配
 */
async function mergeOutfitClothes(id: string): Promise<void> {
  if (!id) return;

  try {
    const detail = await outfitService.getDetail(id);
    if (!detail) return;

    // 搭配里已被删除的衣服跳过（findItem 在已加载的衣服列表里查不到）
    const available = detail.items
      .map((item) => item.clothingId)
      .filter((clothingId) => Boolean(clothingStore.findItem(clothingId)));
    const added = available.filter((clothingId) => !isSelected(clothingId));
    selectedClothingIds.value = Array.from(new Set([...selectedClothingIds.value, ...available]));

    if (added.length) toast.info(`已自动加入「${detail.outfit.name}」里的 ${added.length} 件衣服`);
    else toast.info(`「${detail.outfit.name}」里的衣服都已经选上了`);
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

// 选定搭配 → 自动带出搭配里的衣服
watch(outfitId, async (id) => {
  if (hydrating.value) return;
  await mergeOutfitClothes(id);
});

/** 取消编辑，返回上一页（没有历史记录时回到日历） */
async function handleCancel(): Promise<void> {
  try {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    await router.push({ name: 'diary' });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/**
 * 保存日记，成功后回到日历并定位到保存的那一天。
 * 编辑模式下改了日期时，会删掉原来那天的记录，效果等于把记录挪到新日期。
 */
async function handleSave(): Promise<void> {
  if (!dateValue.value) {
    toast.error('请先选择日期');
    return;
  }

  saving.value = true;
  try {
    // 先记下正在编辑的记录，保存会重载列表，之后需要用它做「挪日期」
    const original = isEditMode.value ? resolveEditingEntry() : undefined;
    const draft: DiaryDraft = {
      date: fromDateInputValue(dateValue.value),
      outfitId: outfitId.value || undefined,
      clothingIds: [...selectedClothingIds.value],
      weather: weather.value,
      occasion: occasion.value,
      note: note.value
    };
    const saved = await diaryStore.save(draft);

    if (original && original.date !== saved.date) {
      await diaryStore.remove(original.id);
      toast.success(`记录已挪到 ${formatDate(saved.date)}`);
    } else {
      toast.success(isEditMode.value ? '这一天的记录已更新' : '这一天的穿搭已记录');
    }

    await router.push({ name: 'diary', query: { date: String(saved.date) } });
  } catch (error) {
    // service 在「既没选搭配也没选衣服」等情况下会抛错，这里统一提示
    toast.error(toErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    // 日记列表用于编辑模式回填与「改日期会覆盖」的提示，所以三种数据一起载入
    await Promise.all([clothingStore.load(), outfitStore.load(), diaryStore.load()]);
    if (isEditMode.value) await applyExistingEntry();
  } catch (error) {
    toast.error(toErrorMessage(error));
  } finally {
    formReady.value = true;
  }
});
</script>

<template>
  <div class="page page--with-header page--narrow diary-edit">
    <PageHeader :title="headerTitle" :subtitle="headerSubtitle" back tone="green" />

    <div class="page__body diary-edit__body">
      <!-- 基本信息：桌面端日期 / 天气 / 场合一行三列，备注整行 -->
      <section class="diary-edit__card m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="circle" color="yellow" size="md" :orbit="1" at="tr" />
        </div>

        <h2 class="m-section-title diary-edit__title">基本信息</h2>

        <div class="diary-edit__fields">
          <AppInput
            v-model="dateValue"
            type="date"
            label="日期"
            icon="calendar"
            required
            :error="dateError"
            :hint="dateHint"
          />
          <AppInput v-model="weather" label="天气" placeholder="如：晴 18 度" :maxlength="20" />
          <AppInput v-model="occasion" label="场合" placeholder="如：通勤、约会" :maxlength="20" />
        </div>

        <p v-if="conflictEntry" class="m-hint diary-edit__warn">
          这一天已经有记录了，保存会把原来那条覆盖掉（同一天只保留一条）。
        </p>

        <AppTextarea
          v-model="note"
          label="备注"
          placeholder="今天穿这套的感受…"
          :rows="3"
          :maxlength="200"
        />
      </section>

      <!-- 关联搭配：选定后自动把搭配里的衣服合并进下面的多选 -->
      <section class="diary-edit__card m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="diamond" color="pink" size="md" :orbit="4" at="tr" />
        </div>

        <h2 class="m-section-title diary-edit__title diary-edit__title--green">关联搭配</h2>

        <AppSelect v-model="outfitId" :options="outfitOptions" placeholder="选择一套搭配" />
        <p class="m-hint">选了搭配会自动把它里面的衣服加进「穿了哪些衣服」，只加不减。</p>
      </section>

      <!-- 衣服多选 -->
      <section class="diary-edit__card m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="ring" color="cyan" size="md" :orbit="2" at="tr" />
        </div>

        <div class="diary-edit__head">
          <h2 class="m-section-title diary-edit__title diary-edit__title--cyan">穿了哪些衣服</h2>
          <span class="m-badge m-badge--cyan m-mono">已选 {{ selectedClothingIds.length }}</span>
        </div>

        <div v-if="clothingStore.items.length" class="diary-edit__grid">
          <button
            v-for="item in clothingStore.items"
            :key="item.clothing.id"
            type="button"
            class="diary-edit__cell"
            :class="{ 'diary-edit__cell--active': isSelected(item.clothing.id) }"
            :aria-pressed="isSelected(item.clothing.id)"
            @click="toggleClothing(item.clothing.id)"
          >
            <img
              v-if="item.thumbnailUrl"
              class="diary-edit__thumb"
              :src="item.thumbnailUrl"
              :alt="item.clothing.name"
              loading="lazy"
            />
            <span v-else class="diary-edit__thumb diary-edit__thumb--empty" aria-hidden="true">
              <AppIcon name="hanger" :size="22" :stroke-width="2.2" />
            </span>

            <span class="diary-edit__cell-name ellipsis">{{ item.clothing.name }}</span>

            <span v-if="isSelected(item.clothing.id)" class="diary-edit__check" aria-hidden="true">
              <AppIcon name="check" :size="13" :stroke-width="3.4" />
            </span>
          </button>
        </div>

        <AppEmpty
          v-else-if="!clothingStore.loading"
          motif="hanger"
          title="还没有衣服"
          description="先去「我的衣柜」添加衣服，再来记录穿搭"
        />

        <p v-else class="m-caption">正在载入衣服…</p>
      </section>

      <!-- 取消 / 保存：手机端贴底（让开底部导航与安全区），桌面端普通按钮行 -->
      <div class="diary-edit__actions">
        <AppButton type="secondary" tone="red" size="lg" @click="handleCancel">取消</AppButton>
        <AppButton
          type="primary"
          tone="green"
          size="lg"
          block
          icon="check"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-edit__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
  /* 给固定底部的操作条留位 */
  padding-bottom: var(--m-10);
}

.diary-edit__card {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.diary-edit__title {
  position: relative;
  z-index: 1;
  --m-title-accent: var(--m-yellow);
}

.diary-edit__title--cyan {
  --m-title-accent: var(--m-cyan);
}

.diary-edit__title--green {
  --m-title-accent: var(--m-green);
}

.diary-edit__fields {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-4);
}

.diary-edit__warn {
  position: relative;
  z-index: 1;
  font-weight: var(--m-weight-bold);
  color: var(--m-danger);
}

/* 标题与计数靠左排，右上角留给几何装饰 */
.diary-edit__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--m-2) var(--m-3);
  flex-wrap: wrap;
  padding-right: var(--m-8);
}

/* ------------------------- 衣服多选网格 ------------------------- */

.diary-edit__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m-3);
  max-height: 46vh;
  overflow-y: auto;
  padding-right: var(--m-2);
  padding-bottom: var(--m-2);
}

.diary-edit__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  min-height: 44px;
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
  .diary-edit__cell:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.diary-edit__cell:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

/* 选中态：撞色实心块 + 更大的硬阴影 + 右上角对勾（不只靠颜色） */
.diary-edit__cell--active {
  background-color: var(--m-green);
  color: var(--m-on-accent);
  border-width: var(--m-bw-thick);
  box-shadow: var(--m-shadow);
}

@media (hover: hover) and (pointer: fine) {
  .diary-edit__cell--active:hover {
    background-color: var(--m-green);
  }
}

.diary-edit__thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-bottom: var(--m-line);
  background-color: var(--m-surface-2);
}

.diary-edit__thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--m-line);
  color: var(--m-text-muted);
}

.diary-edit__cell-name {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  line-height: 1.3;
}

.diary-edit__check {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: var(--m-line);
  background-color: var(--m-yellow);
  color: var(--m-on-accent);
  box-shadow: var(--m-shadow-xs);
}

/* ------------------------- 操作区 ------------------------- */

.diary-edit__actions {
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

/* 「取消」保持自然宽度，「保存」吃掉剩余空间 */
.diary-edit__actions :deep(.m-btn--block) {
  flex: 1 1 auto;
  width: auto;
}

/* ------------------------- 断点 ------------------------- */

/* 大屏手机起：衣服格子多排一列 */
@media (min-width: 640px) {
  .diary-edit__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* 平板起：日期 / 天气 / 场合一行三列，操作条改成普通按钮行 */
@media (min-width: 700px) {
  .diary-edit__body {
    padding-bottom: 0;
  }

  .diary-edit__fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--m-4) var(--m-5);
  }

  .diary-edit__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    max-height: 52vh;
  }

  .diary-edit__actions {
    position: static;
    justify-content: flex-end;
    padding: 0;
    background-color: transparent;
    border-top: none;
    box-shadow: none;
  }

  .diary-edit__actions :deep(.m-btn) {
    min-width: 180px;
  }

  .diary-edit__actions :deep(.m-btn--block) {
    flex: 0 0 auto;
    width: auto;
  }
}

/* 桌面：正文留白再加大，衣服格子一行更多 */
@media (min-width: 1024px) {
  .diary-edit__body {
    gap: var(--m-6);
  }

  .diary-edit__card {
    gap: var(--m-5);
  }

  .diary-edit__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

/* 宽屏：操作按钮再宽一档 */
@media (min-width: 1440px) {
  .diary-edit__actions :deep(.m-btn) {
    min-width: 220px;
  }
}
</style>
