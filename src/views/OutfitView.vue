<!-- 搭配模式（孟菲斯风格）：8 行纵向槽位画布（同一槽位可叠穿多件）+ 按槽位品类筛选的素材网格
     + 已保存搭配横滑区（可直接看到部件名、可删除）。
     手机端保持「上画布 / 下素材」单列，桌面端（≥1024px）改成左画布 / 右素材两栏。 -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppModal from '@/components/base/AppModal.vue';
import AppTabs from '@/components/base/AppTabs.vue';
import AppTextarea from '@/components/base/AppTextarea.vue';
import type { TabItem } from '@/components/base/types';
import OutfitSlot from '@/components/business/OutfitSlot.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import type { OutfitSlotClothing } from '@/components/business/types';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import {
  OUTFIT_SLOT_CATEGORY,
  OUTFIT_SLOT_LABEL,
  OUTFIT_SLOTS,
  type OutfitSlot as OutfitSlotKey
} from '@/models';
import type { OutfitItemDetail, OutfitSummary } from '@/services';
import { useClothingStore, useOutfitStore, useTagStore } from '@/stores';
import { formatDate } from '@/utils/date';

/** 已保存搭配卡片上按槽位分组的一行部件名 */
interface SlotPartLine {
  /** 槽位 key，同时用作列表 key */
  slot: OutfitSlotKey;
  /** 槽位展示文案 */
  label: string;
  /** 该槽位下的衣服名（衣服已被删除时用占位文案） */
  names: string[];
}

const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();
const outfitStore = useOutfitStore();
const clothingStore = useClothingStore();
const tagStore = useTagStore();

/** 素材区当前槽位 key（AppTabs 的 v-model 只接受 string，再用 activeSlot 收窄类型） */
const activeSlotKey = ref<string>(OUTFIT_SLOTS[0]);
/** 是否临时显示全部衣服：当前品类筛选为空时的兜底开关，切换槽位后重置 */
const showAllMaterials = ref(false);
/** 保存弹窗是否显示 */
const saveModalVisible = ref(false);
/** 保存弹窗里的搭配名 */
const draftName = ref('');
/** 保存弹窗里的备注 */
const draftNote = ref('');
/** 是否正在保存 */
const saving = ref(false);

/**
 * 判断字符串是否为合法槽位。
 * @param value 待判断的值
 * @returns 是槽位时返回 true
 */
function isOutfitSlot(value: string): value is OutfitSlotKey {
  return (OUTFIT_SLOTS as readonly string[]).includes(value);
}

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '操作失败，请稍后重试';
}

/** 素材区当前槽位（已收窄为 OutfitSlot） */
const activeSlot = computed<OutfitSlotKey>(() =>
  isOutfitSlot(activeSlotKey.value) ? activeSlotKey.value : OUTFIT_SLOTS[0]
);

/** 当前槽位对应的一级品类名；空数组表示不限品类（「其他」槽位） */
const slotCategories = computed<string[]>(() => OUTFIT_SLOT_CATEGORY[activeSlot.value]);

/** 按当前槽位品类筛选后的衣服（二级标签会回溯到父级品类） */
const categoryMaterials = computed(() =>
  clothingStore.items.filter((item) => tagStore.matchCategory(item.tagIds, slotCategories.value))
);

/** 素材区真正展示的衣服：默认只看当前品类，兜底开关打开时显示全部 */
const materials = computed(() =>
  showAllMaterials.value ? clothingStore.items : categoryMaterials.value
);

/** 素材区筛选说明文案：明确告诉用户现在能选哪一类衣服 */
const filterHint = computed(() => {
  const label = OUTFIT_SLOT_LABEL[activeSlot.value];
  if (!slotCategories.value.length) return '「其他」不限品类，这里显示全部衣服';
  if (showAllMaterials.value) return `已显示全部衣服，包含不属于「${label}」的衣服`;
  return `只显示品类为「${label}」的衣服`;
});

/** 素材区 tab 项：key 用槽位，label 用槽位文案 */
const slotTabs = computed<TabItem[]>(() =>
  OUTFIT_SLOTS.map((slot) => ({ key: slot, label: OUTFIT_SLOT_LABEL[slot] }))
);

/** 当前槽位已选中的衣服 id，供素材块高亮与选中标记使用 */
const activeClothingIds = computed<string[]>(() => outfitStore.canvas[activeSlot.value]);

/**
 * 把槽位里已选的衣服 id 映射成缩略图展示数据。
 * @param slot 槽位
 * @returns 该槽位已选衣服（按叠穿顺序；衣服被删除时跳过）
 */
function slotClothes(slot: OutfitSlotKey): OutfitSlotClothing[] {
  return outfitStore.canvas[slot].flatMap((clothingId) => {
    const item = clothingStore.findItem(clothingId);
    return item
      ? [{ id: item.clothing.id, name: item.clothing.name, thumbnailUrl: item.thumbnailUrl }]
      : [];
  });
}

/**
 * 把搭配的成员明细按槽位分组，供已保存卡片展示「上装：白衬衫、针织背心」。
 * @param items 成员明细
 * @returns 按画布槽位顺序排列的分组
 */
function slotPartLines(items: OutfitItemDetail[]): SlotPartLine[] {
  return OUTFIT_SLOTS.flatMap((slot) => {
    const names = items
      .filter((item) => item.slot === slot)
      .map((item) => item.name || '已删除的衣服');
    return names.length ? [{ slot, label: OUTFIT_SLOT_LABEL[slot], names }] : [];
  });
}

/**
 * 点击画布槽位：把素材区切到该槽位，方便直接往里加衣服。
 * @param slot 被点击的槽位
 */
function selectSlot(slot: OutfitSlotKey): void {
  activeSlotKey.value = slot;
}

/**
 * 点击素材里的衣服：加入当前槽位（已在槽位里则移除）。
 * @param clothingId 衣服 id
 */
function pickClothing(clothingId: string): void {
  outfitStore.toggleSlot(activeSlot.value, clothingId);
}

/** 兜底开关打开：临时显示全部衣服，避免品类筛选为空时走进死胡同 */
function showAllClothes(): void {
  showAllMaterials.value = true;
}

/** 兜底开关关闭：回到只显示当前槽位品类 */
function showCategoryOnly(): void {
  showAllMaterials.value = false;
}

/** 打开保存弹窗，并把画布上的名字与备注回填到表单 */
function openSaveModal(): void {
  draftName.value = outfitStore.canvasName;
  draftNote.value = outfitStore.canvasNote;
  saveModalVisible.value = true;
}

/** 清空画布（画布有内容时先二次确认） */
async function handleClear(): Promise<void> {
  if (outfitStore.canvasEmpty) {
    toast.info('画布还是空的');
    return;
  }
  try {
    const accepted = await confirmDialog.confirm({
      title: '清空画布',
      message: '会移除画布上已选的全部衣服，确定继续吗？',
      confirmText: '清空',
      danger: true
    });
    if (!accepted) return;
    outfitStore.clearCanvas();
    toast.success('已清空画布');
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 从「编辑已保存搭配」另起一套：二次确认后清空画布并退出编辑态 */
async function handleNewOutfit(): Promise<void> {
  try {
    const accepted = await confirmDialog.confirm({
      title: '新建搭配',
      message: '会清空画布上正在编辑的内容，另起一套新的搭配，确定继续吗？',
      confirmText: '新建',
      danger: true
    });
    if (!accepted) return;
    outfitStore.clearCanvas();
    showAllMaterials.value = false;
    toast.success('已新建空白搭配');
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 确认保存当前画布，成功后进入搭配详情 */
async function handleSave(): Promise<void> {
  if (!draftName.value.trim()) {
    toast.error('请先给搭配起个名字');
    return;
  }
  if (outfitStore.canvasEmpty) {
    toast.error('请至少放入一件衣服');
    return;
  }
  saving.value = true;
  try {
    outfitStore.canvasName = draftName.value;
    outfitStore.canvasNote = draftNote.value;
    const saved = await outfitStore.saveCanvas();
    saveModalVisible.value = false;
    toast.success('搭配已保存');
    await router.push({ name: 'outfit-detail', params: { id: saved.id } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

/**
 * 打开已保存的搭配：先跳详情页，详情页会把它载入画布再跳回本页。
 * @param id 搭配 id
 */
async function openSavedOutfit(id: string): Promise<void> {
  try {
    await router.push({ name: 'outfit-detail', params: { id } });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/**
 * 删除一张已保存的搭配（二次确认 + 阻止冒泡，避免误触发卡片跳转）。
 * @param summary 待删除的搭配摘要
 * @param event 鼠标事件
 */
async function removeSavedOutfit(summary: OutfitSummary, event: MouseEvent): Promise<void> {
  event.stopPropagation();
  try {
    const accepted = await confirmDialog.confirm({
      title: '删除搭配',
      message: `删除「${summary.outfit.name}」后无法恢复，确定删除吗？`,
      confirmText: '删除',
      danger: true
    });
    if (!accepted) return;
    await outfitStore.remove(summary.outfit.id);
    toast.success('搭配已删除');
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

/** 一件衣服都没有时的引导：去新增衣服 */
async function goCreateClothing(): Promise<void> {
  try {
    await router.push({ name: 'clothing-new' });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

// 切换槽位后收起「显示全部」兜底，回到按品类筛选
watch(activeSlot, () => {
  showAllMaterials.value = false;
});

// TODO(第二阶段)：画布支持拖拽、长按排序、跨槽位移动。
// TODO(第二阶段)：封面图选择（Outfit.coverImageId，默认取第一件衣服的主图）。
// TODO(第二阶段)：顶部补「收藏」按钮（outfitStore.toggleFavorite / favorites）。
// TODO(第二阶段)：画布有未保存内容时离开页面给出提示。

onMounted(async () => {
  try {
    await Promise.all([
      clothingStore.loaded ? Promise.resolve() : clothingStore.load(),
      tagStore.list.length ? Promise.resolve() : tagStore.load(),
      outfitStore.load()
    ]);
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
});
</script>

<template>
  <div class="page page--with-header outfit-view">
    <PageHeader title="搭配" tone="pink">
      <AppButton
        v-if="outfitStore.editingId"
        type="secondary"
        tone="cyan"
        size="md"
        icon="plus"
        @click="handleNewOutfit"
      >
        新建
      </AppButton>
      <AppButton type="secondary" size="md" icon="close" @click="handleClear">清空</AppButton>
      <AppButton type="primary" tone="green" size="md" icon="check" @click="openSaveModal">保存</AppButton>
    </PageHeader>

    <div class="page__body outfit-view__body">
      <div class="outfit-view__layout">
        <!-- 画布：8 行纵向槽位（几何装饰放在 .m-card 内，hover 时各自漂移） -->
        <section class="outfit-view__canvas m-card m-card--pad">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="circle" color="yellow" size="lg" :orbit="1" at="tr" />
            <AppGeo shape="triangle" color="cyan" size="md" :orbit="2" at="bl" />
          </div>

          <div class="outfit-view__canvas-head">
            <h2 class="m-section-title outfit-view__title">搭配画布</h2>
            <span class="m-badge m-badge--red m-mono">已选 {{ outfitStore.canvasCount }} 件</span>
            <span v-if="outfitStore.editingId" class="m-badge m-badge--green outfit-view__editing">
              编辑中：{{ outfitStore.canvasName || '未命名' }}
            </span>
          </div>

          <div class="outfit-view__slots">
            <OutfitSlot
              v-for="slot in OUTFIT_SLOTS"
              :key="slot"
              :slot="slot"
              :clothes="slotClothes(slot)"
              :active="slot === activeSlot"
              @select="selectSlot"
              @remove="outfitStore.removeFromSlot"
              @clear="outfitStore.clearSlot"
            />
          </div>

          <p class="m-caption outfit-view__canvas-hint">
            点槽位名或虚线按钮切换素材区目标；同一槽位可放多件叠穿，点缩略图右上角移除单件。
          </p>
        </section>

        <!-- 素材区：横向 tab 切换槽位类型 + 按该槽位品类筛选的衣服网格 -->
        <section class="outfit-view__picker m-panel">
          <div class="outfit-view__picker-body">
            <h2 class="m-section-title outfit-view__title outfit-view__title--cyan">素材</h2>

            <AppTabs v-model="activeSlotKey" :tabs="slotTabs" tone="pink" stretch />

            <template v-if="clothingStore.items.length">
              <div class="outfit-view__filter">
                <p class="m-hint outfit-view__filter-text">{{ filterHint }}</p>
                <AppButton
                  v-if="showAllMaterials && slotCategories.length"
                  type="text"
                  size="sm"
                  @click="showCategoryOnly"
                >
                  只看「{{ OUTFIT_SLOT_LABEL[activeSlot] }}」
                </AppButton>
              </div>

              <div v-if="materials.length" class="outfit-view__grid">
                <button
                  v-for="item in materials"
                  :key="item.clothing.id"
                  type="button"
                  class="outfit-view__cell"
                  :class="{ 'outfit-view__cell--active': activeClothingIds.includes(item.clothing.id) }"
                  :aria-pressed="activeClothingIds.includes(item.clothing.id)"
                  @click="pickClothing(item.clothing.id)"
                >
                  <img
                    v-if="item.thumbnailUrl"
                    class="outfit-view__thumb"
                    :src="item.thumbnailUrl"
                    :alt="item.clothing.name"
                  />
                  <span v-else class="outfit-view__thumb outfit-view__thumb--empty" aria-hidden="true">
                    <AppIcon name="hanger" :size="22" :stroke-width="2.2" />
                  </span>

                  <span class="outfit-view__cell-name ellipsis">{{ item.clothing.name }}</span>

                  <span
                    v-if="activeClothingIds.includes(item.clothing.id)"
                    class="outfit-view__check"
                    aria-hidden="true"
                  >
                    <AppIcon name="check" :size="13" :stroke-width="3.4" />
                  </span>
                </button>
              </div>

              <!-- 兜底：品类筛选后一件都没有时，给一条明确的出路 -->
              <div v-else class="outfit-view__fallback">
                <p class="outfit-view__fallback-title">
                  「{{ OUTFIT_SLOT_LABEL[activeSlot] }}」分类下还没有衣服
                </p>
                <p class="m-caption">
                  给衣服打上「{{ slotCategories.join('、') }}」品类标签后就会出现在这里，也可以先临时看全部衣服。
                </p>
                <div class="outfit-view__fallback-actions">
                  <AppButton type="secondary" tone="cyan" size="md" icon="grid" @click="showAllClothes">
                    显示全部衣服
                  </AppButton>
                  <AppButton type="secondary" tone="red" size="md" icon="plus" @click="goCreateClothing">
                    去添加衣服
                  </AppButton>
                </div>
              </div>
            </template>

            <AppEmpty
              v-else-if="!clothingStore.loading"
              motif="hanger"
              title="还没有衣服"
              description="先去「我的衣柜」添加衣服，才能开始搭配"
            >
              <AppButton type="secondary" tone="red" size="md" icon="plus" @click="goCreateClothing">
                去添加衣服
              </AppButton>
            </AppEmpty>

            <p v-else class="m-caption">正在载入衣服…</p>
          </div>
        </section>
      </div>

      <!-- 已保存的搭配：显示各部件名、总件数与日期，卡片上可直接删除 -->
      <section class="outfit-view__saved">
        <h2 class="m-section-title outfit-view__title outfit-view__title--green">已保存的搭配</h2>

        <div v-if="outfitStore.summaries.length" class="outfit-view__saved-list scroll-x">
          <article
            v-for="summary in outfitStore.summaries"
            :key="summary.outfit.id"
            class="outfit-view__saved-card m-card"
            :class="{ 'outfit-view__saved-card--editing': summary.outfit.id === outfitStore.editingId }"
          >
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="ring" color="pink" size="sm" :orbit="1" at="br" />
            </div>

            <button
              type="button"
              class="outfit-view__saved-open"
              :aria-label="`打开搭配「${summary.outfit.name}」`"
              @click="openSavedOutfit(summary.outfit.id)"
            >
              <span class="outfit-view__saved-head">
                <span class="outfit-view__saved-name m-pop ellipsis">{{ summary.outfit.name }}</span>
                <span v-if="summary.outfit.id === outfitStore.editingId" class="m-badge m-badge--green">
                  编辑中
                </span>
              </span>

              <span v-if="summary.items.length" class="outfit-view__saved-parts ellipsis-2">
                <template v-for="(line, index) in slotPartLines(summary.items)" :key="line.slot">
                  <span v-if="index" class="outfit-view__saved-sep" aria-hidden="true">／</span>
                  <span class="outfit-view__saved-part">
                    <span class="outfit-view__saved-slot">{{ line.label }}：</span>{{ line.names.join('、') }}
                  </span>
                </template>
              </span>
              <span v-else class="outfit-view__saved-parts m-caption">这套搭配里的衣服都被删除了</span>

              <span class="outfit-view__saved-foot">
                <span class="m-badge m-badge--cyan m-mono">{{ summary.items.length }} 件</span>
                <span class="m-mono outfit-view__saved-date">
                  {{ formatDate(summary.outfit.updatedAt) }}
                </span>
              </span>
            </button>

            <button
              type="button"
              class="outfit-view__saved-delete"
              :aria-label="`删除搭配「${summary.outfit.name}」`"
              @click="removeSavedOutfit(summary, $event)"
            >
              <AppIcon name="trash" :size="15" :stroke-width="2.6" />
            </button>
          </article>
        </div>

        <AppEmpty
          v-else
          motif="layers"
          title="还没有保存的搭配"
          description="选好衣服后点右上角「保存」，搭配就会出现在这里"
        />
      </section>
    </div>

    <!-- 保存弹窗 -->
    <AppModal
      v-model="saveModalVisible"
      title="保存搭配"
      subtitle="起个名字，下次在「已保存的搭配」里一眼就能找到"
      tone="green"
      position="bottom"
    >
      <div class="outfit-view__form">
        <AppInput v-model="draftName" label="搭配名" placeholder="如：初夏通勤" :maxlength="20" required />
        <AppTextarea v-model="draftNote" label="备注" placeholder="想记点什么？" :rows="3" :maxlength="200" />
        <p class="m-hint">画布上已有 {{ outfitStore.canvasCount }} 件衣服</p>
      </div>

      <template #footer>
        <AppButton type="secondary" @click="saveModalVisible = false">取消</AppButton>
        <AppButton type="primary" tone="green" :loading="saving" @click="handleSave">保存</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.outfit-view__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-6);
}

/* 手机：画布在上、素材在下；桌面：左画布（固定宽）/ 右素材（自适应） */
.outfit-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-5);
  align-items: start;
}

/* 分区标题：每块换一种撞色方块，避免单调 */
.outfit-view__title {
  --m-title-accent: var(--m-pink);
}

.outfit-view__title--cyan {
  --m-title-accent: var(--m-cyan);
}

.outfit-view__title--green {
  --m-title-accent: var(--m-green);
}

/* ------------------------- 画布 ------------------------- */

.outfit-view__canvas {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

/* 标题与计数靠左排，右上角留给几何装饰 */
.outfit-view__canvas-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--m-2) var(--m-3);
  flex-wrap: wrap;
  padding-right: var(--m-8);
}

/* 编辑态标记：名字过长时截断，不撑破卡片 */
.outfit-view__editing {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 8 行槽位纵向排列；手机上画布区自己滚动，页面不被撑长 */
.outfit-view__slots {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  max-height: 46vh;
  overflow-y: auto;
  padding-right: var(--m-1);
  padding-bottom: var(--m-1);
}

.outfit-view__canvas-hint {
  position: relative;
  z-index: 1;
}

/* ------------------------- 素材区 ------------------------- */

.outfit-view__picker {
  padding: var(--m-4);
}

.outfit-view__picker-body {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

/* 筛选说明 + 「只看本类」回退入口 */
.outfit-view__filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m-2) var(--m-3);
  flex-wrap: wrap;
}

.outfit-view__filter-text {
  flex: 1;
  min-width: 0;
}

.outfit-view__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m-3);
  max-height: 46vh;
  overflow-y: auto;
  padding-right: var(--m-2);
  padding-bottom: var(--m-2);
}

/* 素材块：粗描边方块 + 缩略图 + 名字 */
.outfit-view__cell {
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
  .outfit-view__cell:hover {
    background-color: var(--m-yellow);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.outfit-view__cell:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

/* 选中态：撞色实心块 + 更大的硬阴影 + 右上角对勾（不只靠颜色） */
.outfit-view__cell--active {
  background-color: var(--m-pink);
  color: var(--m-on-accent);
  box-shadow: var(--m-shadow);
}

@media (hover: hover) and (pointer: fine) {
  .outfit-view__cell--active:hover {
    background-color: var(--m-pink);
  }
}

.outfit-view__thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-bottom: var(--m-line);
  background-color: var(--m-surface-2);
}

.outfit-view__thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--m-text-muted);
}

.outfit-view__cell-name {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
  line-height: 1.3;
}

.outfit-view__check {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: var(--m-line);
  background-color: var(--m-green);
  color: var(--m-on-accent);
  box-shadow: var(--m-shadow-xs);
}

/* 品类筛不出衣服时的兜底：虚线框 + 两条明确出路 */
.outfit-view__fallback {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--m-3);
  padding: var(--m-4);
  border: 2px dashed var(--m-line-color);
  border-radius: var(--m-radius);
  background-color: var(--m-surface-2);
}

.outfit-view__fallback-title {
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
  color: var(--m-text);
}

.outfit-view__fallback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-3);
}

/* ------------------------- 已保存的搭配 ------------------------- */

.outfit-view__saved {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.outfit-view__saved-list {
  gap: var(--m-4);
  padding: var(--m-1) var(--m-6) var(--m-6) var(--m-1);
  align-items: stretch;
}

.outfit-view__saved-card {
  flex: 0 0 auto;
  width: 236px;
  display: flex;
  flex-direction: column;
  scroll-snap-align: start;
}

.outfit-view__saved-card--editing {
  background-color: var(--m-yellow);
}

/* 整卡可点：真正的按钮铺满卡片，删除按钮是它的兄弟节点（避免按钮嵌套） */
.outfit-view__saved-open {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--m-2);
  width: 100%;
  padding: var(--m-3);
  padding-right: var(--m-7);
  border: none;
  background-color: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.outfit-view__saved-open:active {
  transform: translate(3px, 3px);
}

.outfit-view__saved-head {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  width: 100%;
  min-width: 0;
}

.outfit-view__saved-name {
  --m-pop: var(--m-cyan);
  flex: 1;
  min-width: 0;
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
}

.outfit-view__saved-parts {
  display: -webkit-box;
  width: 100%;
  font-size: var(--m-fs-xs);
  line-height: 1.5;
  color: var(--m-text);
}

.outfit-view__saved-part {
  display: inline;
}

.outfit-view__saved-slot {
  font-weight: var(--m-weight-black);
}

.outfit-view__saved-sep {
  color: var(--m-text-muted);
}

.outfit-view__saved-foot {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: var(--m-1);
}

.outfit-view__saved-date {
  font-size: var(--m-fs-xs);
  color: var(--m-text-muted);
}

.outfit-view__saved-delete {
  position: absolute;
  z-index: 2;
  top: var(--m-2);
  right: var(--m-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .outfit-view__saved-delete:hover {
    background-color: var(--m-red);
    color: var(--m-on-accent);
    box-shadow: var(--m-shadow-sm);
  }
}

.outfit-view__saved-delete:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* ------------------------- 保存弹窗表单 ------------------------- */

.outfit-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

/* ------------------------- 断点 ------------------------- */

/* 平板：素材网格从 3 列变 4 列 */
@media (min-width: 640px) {
  .outfit-view__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* 桌面：左右两栏；左栏画布固定宽度，槽位不再需要内部滚动 */
@media (min-width: 1024px) {
  .outfit-view__layout {
    grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
    gap: var(--m-7);
  }

  .outfit-view__slots {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
    padding-bottom: 0;
  }

  .outfit-view__picker {
    padding: var(--m-5);
  }

  .outfit-view__picker-body {
    gap: var(--m-5);
  }

  .outfit-view__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    max-height: 62vh;
  }
}

/* 超宽屏：素材网格放到 6 列，一屏能看完更多衣服 */
@media (min-width: 1440px) {
  .outfit-view__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .outfit-view__saved-card {
    width: 256px;
  }
}
</style>
