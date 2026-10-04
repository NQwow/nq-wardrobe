<!-- 搭配模式（孟菲斯风格）：8 槽位画布 + 按槽位切换的素材网格 + 已保存搭配横滑区。
     手机端保持「上画布 / 下素材」单列，桌面端（≥1024px）改成左画布 / 右素材两栏。 -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { OUTFIT_SLOT_LABEL, OUTFIT_SLOTS, type OutfitSlot as OutfitSlotKey } from '@/models';
import { useClothingStore, useOutfitStore } from '@/stores';
import { formatDate } from '@/utils/date';

/** 槽位中已选衣服的展示信息（与 OutfitSlot 组件的 clothing 属性保持一致） */
interface SlotClothing {
  /** 衣服 id */
  id: string;
  /** 衣服名字 */
  name: string;
  /** 主图缩略图地址 */
  thumbnailUrl?: string;
}

const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();
const outfitStore = useOutfitStore();
const clothingStore = useClothingStore();

/** 素材区当前槽位 key（AppTabs 的 v-model 只接受 string，用 activeSlot 收窄类型） */
const activeSlotKey = ref<string>(OUTFIT_SLOTS[0]);
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

/** 素材区 tab 项：key 用槽位，label 用槽位文案 */
const slotTabs = computed<TabItem[]>(() =>
  OUTFIT_SLOTS.map((slot) => ({ key: slot, label: OUTFIT_SLOT_LABEL[slot] }))
);

/** 8 个槽位当前选中的衣服（供 OutfitSlot 展示，衣服被删除时为空） */
const slotClothingMap = computed<Record<OutfitSlotKey, SlotClothing | null>>(() => {
  const result = {} as Record<OutfitSlotKey, SlotClothing | null>;
  for (const slot of OUTFIT_SLOTS) {
    const clothingId = outfitStore.canvas[slot];
    const item = clothingId ? clothingStore.findItem(clothingId) : undefined;
    result[slot] = item
      ? { id: item.clothing.id, name: item.clothing.name, thumbnailUrl: item.thumbnailUrl }
      : null;
  }
  return result;
});

/** 当前槽位已选中的衣服 id（素材区高亮用） */
const activeClothingId = computed(() => outfitStore.canvas[activeSlot.value]);

/**
 * 点击画布槽位：把素材区切到该槽位，方便直接替换。
 * @param slot 被点击的槽位
 */
function handleSlotSelect(slot: OutfitSlotKey): void {
  activeSlotKey.value = slot;
}

/**
 * 移除某个槽位上已选的衣服。
 * @param slot 槽位
 */
function handleSlotClear(slot: OutfitSlotKey): void {
  outfitStore.clearSlot(slot);
}

/**
 * 点击素材区衣服：填入当前槽位，再次点击同一件则取消。
 * @param clothingId 衣服 id
 */
function handlePickClothing(clothingId: string): void {
  outfitStore.toggleSlot(activeSlot.value, clothingId);
}

/** 打开保存弹窗，并把画布上的名字与备注回填到表单 */
function openSaveModal(): void {
  draftName.value = outfitStore.canvasName;
  draftNote.value = outfitStore.canvasNote;
  saveModalVisible.value = true;
}

/** 清空画布（画布有内容时先二次确认） */
async function handleClear(): Promise<void> {
  if (outfitStore.canvasCount === 0) {
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

/** 确认保存当前画布，成功后进入搭配详情 */
async function handleSave(): Promise<void> {
  if (!draftName.value.trim()) {
    toast.error('请先给搭配起个名字');
    return;
  }
  if (outfitStore.canvasCount === 0) {
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

/** 一件衣服都没有时的引导：去新增衣服 */
async function goCreateClothing(): Promise<void> {
  try {
    await router.push({ name: 'clothing-new' });
  } catch (error) {
    toast.error(toErrorMessage(error));
  }
}

// TODO(第二阶段)：画布支持拖拽、同槽位放多件衣服、长按排序。
// TODO(第二阶段)：按品类标签自动推荐槽位（上装衣服只出现在上装 tab），而不是现在这样全量展示。
// TODO(第二阶段)：封面图选择（Outfit.coverImageId，默认取第一件衣服的主图）。
// TODO(第二阶段)：顶部补「收藏」按钮（outfitStore.toggleFavorite / favorites）。
// TODO(第二阶段)：画布有未保存内容时离开页面给出提示。

onMounted(async () => {
  try {
    await Promise.all([
      clothingStore.loaded ? Promise.resolve() : clothingStore.load(),
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
      <AppButton type="secondary" size="md" icon="close" @click="handleClear">清空</AppButton>
      <AppButton type="primary" tone="green" size="md" icon="check" @click="openSaveModal">保存</AppButton>
    </PageHeader>

    <div class="page__body outfit-view__body">
      <div class="outfit-view__layout">
        <!-- 画布：8 个槽位（几何装饰放在 .m-card 内，hover 时各自漂移） -->
        <section class="outfit-view__canvas m-card m-card--pad">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="circle" color="yellow" size="lg" :orbit="1" at="tr" />
            <AppGeo shape="triangle" color="cyan" size="md" :orbit="2" at="bl" />
          </div>

          <div class="outfit-view__canvas-head">
            <h2 class="m-section-title outfit-view__title">搭配画布</h2>
            <span class="m-badge m-badge--red m-mono">
              {{ outfitStore.canvasCount }} / {{ OUTFIT_SLOTS.length }}
            </span>
          </div>

          <div class="outfit-view__slots">
            <OutfitSlot
              v-for="slot in OUTFIT_SLOTS"
              :key="slot"
              :slot="slot"
              :clothing="slotClothingMap[slot]"
              :active="slot === activeSlot"
              @select="handleSlotSelect"
              @clear="handleSlotClear"
            />
          </div>
        </section>

        <!-- 素材区：横向 tab 切换槽位类型 + 该类型衣服网格 -->
        <section class="outfit-view__picker m-panel">
          <div class="outfit-view__picker-body">
            <h2 class="m-section-title outfit-view__title outfit-view__title--cyan">素材</h2>

            <AppTabs v-model="activeSlotKey" :tabs="slotTabs" tone="pink" stretch />

            <p class="m-hint">
              点衣服填入「{{ OUTFIT_SLOT_LABEL[activeSlot] }}」，再点一次取消
            </p>

            <div v-if="clothingStore.items.length" class="outfit-view__grid">
              <button
                v-for="item in clothingStore.items"
                :key="item.clothing.id"
                type="button"
                class="outfit-view__cell"
                :class="{ 'outfit-view__cell--active': item.clothing.id === activeClothingId }"
                :aria-pressed="item.clothing.id === activeClothingId"
                @click="handlePickClothing(item.clothing.id)"
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
                  v-if="item.clothing.id === activeClothingId"
                  class="outfit-view__check"
                  aria-hidden="true"
                >
                  <AppIcon name="check" :size="13" :stroke-width="3.4" />
                </span>
              </button>
            </div>

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

      <!-- 已保存的搭配 -->
      <section class="outfit-view__saved">
        <h2 class="m-section-title outfit-view__title outfit-view__title--green">已保存的搭配</h2>

        <div v-if="outfitStore.list.length" class="outfit-view__saved-list scroll-x">
          <button
            v-for="outfit in outfitStore.list"
            :key="outfit.id"
            type="button"
            class="outfit-view__saved-card m-card"
            :class="{ 'outfit-view__saved-card--editing': outfit.id === outfitStore.editingId }"
            @click="openSavedOutfit(outfit.id)"
          >
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="ring" color="pink" size="sm" :orbit="1" at="br" />
            </div>

            <span class="outfit-view__saved-name m-pop ellipsis">{{ outfit.name }}</span>

            <span v-if="outfit.id === outfitStore.editingId" class="m-badge m-badge--green">
              编辑中
            </span>
            <span v-else class="outfit-view__saved-meta m-mono">{{ formatDate(outfit.updatedAt) }}</span>
          </button>
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

.outfit-view__slots {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--m-3);
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

/* ------------------------- 已保存的搭配 ------------------------- */

.outfit-view__saved {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

.outfit-view__saved-list {
  gap: var(--m-4);
  padding: var(--m-1) var(--m-6) var(--m-6) var(--m-1);
}

.outfit-view__saved-card {
  flex: 0 0 auto;
  width: 158px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--m-2);
  padding: var(--m-3);
  scroll-snap-align: start;
  text-align: left;
  cursor: pointer;
}

.outfit-view__saved-card--editing {
  background-color: var(--m-yellow);
  color: var(--m-on-accent);
}

.outfit-view__saved-name {
  --m-pop: var(--m-cyan);
  position: relative;
  z-index: 1;
  width: 100%;
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
}

.outfit-view__saved-meta {
  position: relative;
  z-index: 1;
  font-size: var(--m-fs-xs);
  color: var(--m-text-muted);
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

/* 桌面：左右两栏；左栏画布固定宽度，槽位改成 3 列更像孟菲斯的错落感 */
@media (min-width: 1024px) {
  .outfit-view__layout {
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    gap: var(--m-7);
  }

  .outfit-view__slots {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .outfit-view__picker {
    padding: var(--m-5);
  }

  .outfit-view__grid {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
    padding-bottom: var(--m-1);
  }

  .outfit-view__picker-body {
    gap: var(--m-5);
  }
}

/* 超宽屏：素材网格放到 6 列，一屏能看完更多衣服 */
@media (min-width: 1440px) {
  .outfit-view__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .outfit-view__saved-card {
    width: 176px;
  }
}
</style>
