<!-- 日记新增（孟菲斯风格）：日期 / 天气 / 场合 / 备注 + 衣服多选 + 关联搭配。
     手机端「保存」固定在底部导航之上，桌面端（≥700px）变成普通按钮行。 -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
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
import type { DiaryDraft } from '@/services';
import { useClothingStore, useDiaryStore, useOutfitStore } from '@/stores';
import { fromDateInputValue, toDateInputValue } from '@/utils/date';

const router = useRouter();
const toast = useToast();
const clothingStore = useClothingStore();
const outfitStore = useOutfitStore();
const diaryStore = useDiaryStore();

/** 穿着日期（YYYY-MM-DD，配合 AppInput 的 date 类型），默认今天 */
const dateValue = ref(toDateInputValue(Date.now()));
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
/** 是否正在保存 */
const saving = ref(false);

/** 关联搭配的下拉选项（第一项固定为「不关联搭配」空选项） */
const outfitOptions = computed<SelectOption[]>(() => [
  { value: '', label: '不关联搭配' },
  ...outfitStore.list.map((outfit) => ({ value: outfit.id, label: outfit.name }))
]);

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '保存失败，请稍后重试';
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

/** 保存日记，成功后回到日记列表 */
async function handleSave(): Promise<void> {
  saving.value = true;
  try {
    const draft: DiaryDraft = {
      date: fromDateInputValue(dateValue.value),
      outfitId: outfitId.value || undefined,
      clothingIds: [...selectedClothingIds.value],
      weather: weather.value,
      occasion: occasion.value,
      note: note.value
    };
    await diaryStore.save(draft);
    toast.success('今天的穿搭已记录');
    router.back();
  } catch (error) {
    // service 在「既没选搭配也没选衣服」等情况下会抛错，这里统一提示
    toast.error(toErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

// TODO(第二阶段)：打开页面时先查当天是否已有日记（diaryService.getByDate），有则回填为编辑。
// TODO(第二阶段)：提交前的本地校验与字段错误高亮（日期必填、至少一套搭配或一件衣服）。
// TODO(第二阶段)：衣服多选支持按品类/季节筛选；选定搭配后自动带出该搭配里的全部衣服。
// TODO(第二阶段)：天气与场合改成预设选择器（配合标签体系），而不是纯手输。

onMounted(async () => {
  try {
    await Promise.all([clothingStore.load(), outfitStore.load()]);
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
});
</script>

<template>
  <div class="page page--with-header page--narrow diary-edit">
    <PageHeader title="记录今天" back tone="green" />

    <div class="page__body diary-edit__body">
      <!-- 基本信息：桌面端日期 / 天气 / 场合一行三列，备注整行 -->
      <section class="diary-edit__card m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="circle" color="yellow" size="md" :orbit="1" at="tr" />
        </div>

        <h2 class="m-section-title diary-edit__title">今天的基本信息</h2>

        <div class="diary-edit__fields">
          <AppInput v-model="dateValue" type="date" label="日期" icon="calendar" required />
          <AppInput v-model="weather" label="天气" placeholder="如：晴 18 度" :maxlength="20" />
          <AppInput v-model="occasion" label="场合" placeholder="如：通勤、约会" :maxlength="20" />
        </div>

        <AppTextarea
          v-model="note"
          label="备注"
          placeholder="今天穿这套的感受…"
          :rows="3"
          :maxlength="200"
        />
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

      <!-- 关联搭配（第二阶段会与衣服选择联动） -->
      <section class="diary-edit__card m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="diamond" color="pink" size="md" :orbit="4" at="tr" />
        </div>

        <h2 class="m-section-title diary-edit__title diary-edit__title--green">关联搭配</h2>

        <AppSelect v-model="outfitId" :options="outfitOptions" placeholder="选择一套搭配" />
      </section>

      <!-- 保存：手机端贴底（让开底部导航与安全区），桌面端普通按钮行 -->
      <div class="diary-edit__actions">
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
  /* 给固定底部的保存条留位 */
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

/* ------------------------- 保存操作区 ------------------------- */

.diary-edit__actions {
  position: fixed;
  left: var(--m-rail);
  right: 0;
  bottom: calc(var(--m-nav-h) + var(--m-safe-b));
  z-index: 30;
  padding: var(--m-3) var(--m-4);
  background-color: var(--m-surface);
  border-top: var(--m-line);
  box-shadow: 0 -4px 0 0 var(--m-line-color);
}

/* ------------------------- 断点 ------------------------- */

/* 平板起：日期 / 天气 / 场合一行三列，保存改成普通按钮行 */
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
    display: flex;
    justify-content: flex-end;
    padding: 0;
    background-color: transparent;
    border-top: none;
    box-shadow: none;
  }

  .diary-edit__actions :deep(.m-btn) {
    width: auto;
    min-width: 220px;
  }
}

/* 桌面：正文留白再加大 */
@media (min-width: 1024px) {
  .diary-edit__body {
    gap: var(--m-6);
  }

  .diary-edit__card {
    gap: var(--m-5);
  }
}
</style>
