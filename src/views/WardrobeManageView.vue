/**
 * WardrobeManageView：衣柜管理页（孟菲斯风格）。
 * 展示全部衣柜，支持新增 / 编辑（名称、几何标识形状、撞色）、排序、设为默认与删除迁移。
 * 衣柜标识由「形状令牌 + 撞色令牌」组成，页面内不出现任何 emoji。
 */
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppModal from '@/components/base/AppModal.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { useWardrobeStore } from '@/stores';
import {
  DEFAULT_WARDROBE_SHAPE,
  DEFAULT_WARDROBE_TONE,
  WARDROBE_SHAPES,
  WARDROBE_TONES,
  isWardrobeShape,
  isWardrobeTone,
  type Wardrobe,
  type WardrobeShape,
  type WardrobeTone
} from '@/models';
import { validateWardrobeName } from '@/utils/validate';

/** 衣柜表单数据 */
interface WardrobeForm {
  /** 衣柜名 */
  name: string;
  /** 标识形状令牌 */
  icon: WardrobeShape;
  /** 标识撞色令牌 */
  color: WardrobeTone;
}

/** 衣柜名最大长度 */
const NAME_MAX = 12;

/** 形状的中文名（用于 title 与无障碍标签） */
const SHAPE_LABEL: Record<WardrobeShape, string> = {
  circle: '圆形',
  ring: '圆环',
  square: '方形',
  diamond: '菱形',
  triangle: '三角',
  half: '半圆',
  cross: '十字'
};

/** 撞色的中文名（用于 title 与无障碍标签） */
const TONE_LABEL: Record<WardrobeTone, string> = {
  red: '红',
  yellow: '黄',
  cyan: '青',
  pink: '粉',
  green: '绿',
  ink: '墨黑'
};

/**
 * 新建一份空表单。
 * @returns 初始表单数据
 */
function emptyForm(): WardrobeForm {
  return { name: '', icon: DEFAULT_WARDROBE_SHAPE, color: DEFAULT_WARDROBE_TONE };
}

/**
 * 把未知异常转成可展示的文案。
 * @param error 捕获到的异常
 * @param fallback 无可用信息时的兜底文案
 * @returns 提示文案
 */
function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const toast = useToast();
const confirmDialog = useConfirm();
const wardrobeStore = useWardrobeStore();

/** 弹窗是否显示 */
const modalVisible = ref(false);
/** 正在编辑的衣柜 id，空串表示新增 */
const editingId = ref('');
/** 表单数据 */
const form = ref<WardrobeForm>(emptyForm());
/** 表单校验错误 */
const formError = ref('');
/** 保存中 */
const saving = ref(false);

/** 弹窗标题 */
const modalTitle = computed<string>(() => (editingId.value ? '编辑衣柜' : '新增衣柜'));

/** 是否没有衣柜（空状态） */
const isEmpty = computed<boolean>(() => wardrobeStore.list.length === 0);

/** 表单当前选中的撞色（形状选择器用它上色） */
const currentTone = computed<WardrobeTone>(() => form.value.color);

/**
 * 加载衣柜列表。
 */
async function ensureLoaded(): Promise<void> {
  try {
    await wardrobeStore.load();
  } catch (error) {
    toast.error(toMessage(error, '衣柜加载失败'));
  }
}

/**
 * 取衣柜内的衣服数量。
 * @param id 衣柜 id
 * @returns 衣服数量，无统计时为 0
 */
function countOf(id: string): number {
  return wardrobeStore.counts[id] ?? 0;
}

/**
 * 判断是否为默认衣柜。
 * @param id 衣柜 id
 * @returns 是否为默认衣柜
 */
function isDefault(id: string): boolean {
  return wardrobeStore.defaultWardrobeId === id;
}

/**
 * 取衣柜的标识形状，非法值回退到默认形状。
 * @param wardrobe 衣柜
 * @returns 形状令牌
 */
function shapeOf(wardrobe: Wardrobe): WardrobeShape {
  return isWardrobeShape(wardrobe.icon) ? wardrobe.icon : DEFAULT_WARDROBE_SHAPE;
}

/**
 * 取衣柜的标识撞色，非法值回退到默认撞色。
 * @param wardrobe 衣柜
 * @returns 撞色令牌
 */
function toneOf(wardrobe: Wardrobe): WardrobeTone {
  return isWardrobeTone(wardrobe.color) ? wardrobe.color : DEFAULT_WARDROBE_TONE;
}

/**
 * 打开新增弹窗。
 */
function openCreate(): void {
  editingId.value = '';
  form.value = emptyForm();
  formError.value = '';
  modalVisible.value = true;
}

/**
 * 打开编辑弹窗。
 * @param wardrobe 待编辑的衣柜
 */
function openEdit(wardrobe: Wardrobe): void {
  editingId.value = wardrobe.id;
  form.value = {
    name: wardrobe.name,
    icon: shapeOf(wardrobe),
    color: toneOf(wardrobe)
  };
  formError.value = '';
  modalVisible.value = true;
}

/**
 * 选择标识形状。
 * @param shape 形状令牌
 */
function selectIcon(shape: WardrobeShape): void {
  form.value.icon = shape;
}

/**
 * 选择标识撞色。
 * @param tone 撞色令牌
 */
function selectColor(tone: WardrobeTone): void {
  form.value.color = tone;
}

/**
 * 保存表单（新增或编辑）。
 */
async function handleSubmit(): Promise<void> {
  const otherNames = wardrobeStore.list
    .filter((item) => item.id !== editingId.value)
    .map((item) => item.name);
  const error = validateWardrobeName(form.value.name, otherNames);
  if (error) {
    formError.value = error;
    return;
  }
  formError.value = '';
  saving.value = true;
  try {
    const payload = { name: form.value.name.trim(), icon: form.value.icon, color: form.value.color };
    if (editingId.value) {
      await wardrobeStore.update(editingId.value, payload);
      toast.success('衣柜已更新');
    } else {
      await wardrobeStore.create(payload);
      toast.success('衣柜已创建');
    }
    modalVisible.value = false;
  } catch (err) {
    toast.error(toMessage(err, '衣柜保存失败'));
  } finally {
    saving.value = false;
  }
}

/**
 * 上移 / 下移衣柜。
 * @param id 衣柜 id
 * @param direction -1 上移，1 下移
 */
async function handleMove(id: string, direction: -1 | 1): Promise<void> {
  try {
    const moved = await wardrobeStore.move(id, direction);
    if (!moved) toast.info(direction === -1 ? '已经到顶了' : '已经到底了');
  } catch (error) {
    toast.error(toMessage(error, '排序失败'));
  }
}

/**
 * 设为默认衣柜。
 * @param id 衣柜 id
 */
async function handleSetDefault(id: string): Promise<void> {
  try {
    await wardrobeStore.setDefault(id);
    toast.success('已设为默认衣柜');
  } catch (error) {
    toast.error(toMessage(error, '设置默认衣柜失败'));
  }
}

/**
 * 删除衣柜：二次确认后把里面的衣服迁移到默认衣柜（默认衣柜即自身时取第一个其它衣柜）。
 * @param wardrobe 待删除的衣柜
 */
async function handleRemove(wardrobe: Wardrobe): Promise<void> {
  const fallback = wardrobeStore.list.find((item) => item.id !== wardrobe.id);
  const preferred = wardrobeStore.defaultWardrobe;
  const target = preferred && preferred.id !== wardrobe.id ? preferred : fallback;
  if (!target) {
    toast.error('至少要保留一个衣柜');
    return;
  }

  const count = countOf(wardrobe.id);
  try {
    const confirmed = await confirmDialog.confirm({
      title: '删除衣柜',
      message:
        count > 0
          ? `「${wardrobe.name}」里的 ${count} 件衣服将迁移到「${target.name}」，删除后不可恢复。确定继续吗？`
          : `确定删除衣柜「${wardrobe.name}」吗？删除后不可恢复。`,
      confirmText: '删除',
      danger: true
    });
    if (!confirmed) return;

    const migrated = await wardrobeStore.remove(wardrobe.id, target.id);
    toast.success(
      migrated > 0 ? `已删除衣柜，${migrated} 件衣服已迁移到「${target.name}」` : '衣柜已删除'
    );
  } catch (error) {
    toast.error(toMessage(error, '衣柜删除失败'));
  }
}

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <div class="page page--with-header">
    <PageHeader title="衣柜管理" :back="true" subtitle="形状与撞色即衣柜的标识">
      <AppButton size="sm" icon="plus" @click="openCreate">新增衣柜</AppButton>
    </PageHeader>

    <div class="page__body">
      <AppEmpty
        v-if="isEmpty"
        motif="hanger"
        title="还没有衣柜"
        description="新建一个衣柜来分类整理衣服，例如「当季」「老家」"
      >
        <AppButton icon="plus" @click="openCreate">新增衣柜</AppButton>
      </AppEmpty>

      <ul v-else class="wardrobes">
        <li
          v-for="wardrobe in wardrobeStore.list"
          :key="wardrobe.id"
          class="m-card m-card--pad wardrobes__item"
        >
          <!-- 卡片内几何装饰：hover 时按 orbit 各自漂移 -->
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="diamond" color="pink" size="sm" :orbit="2" at="tr" />
          </div>

          <div class="wardrobes__main">
            <span class="wardrobes__mark">
              <AppGeo :shape="shapeOf(wardrobe)" :color="toneOf(wardrobe)" size="md" />
            </span>

            <div class="wardrobes__info">
              <p class="wardrobes__name">
                <span class="ellipsis">{{ wardrobe.name }}</span>
                <span v-if="isDefault(wardrobe.id)" class="m-badge m-badge--ink">默认</span>
              </p>
              <p class="wardrobes__meta m-mono">{{ countOf(wardrobe.id) }} 件衣服</p>
            </div>
          </div>

          <div class="wardrobes__actions">
            <button
              class="icon-btn"
              type="button"
              aria-label="上移"
              title="上移"
              @click="handleMove(wardrobe.id, -1)"
            >
              <AppIcon name="arrow-up" :size="18" :stroke-width="3" />
            </button>

            <button
              class="icon-btn"
              type="button"
              aria-label="下移"
              title="下移"
              @click="handleMove(wardrobe.id, 1)"
            >
              <AppIcon name="arrow-down" :size="18" :stroke-width="3" />
            </button>

            <AppButton
              v-if="!isDefault(wardrobe.id)"
              class="wardrobes__default"
              type="secondary"
              tone="cyan"
              size="sm"
              icon="star"
              @click="handleSetDefault(wardrobe.id)"
            >
              设为默认
            </AppButton>

            <button
              class="icon-btn"
              type="button"
              aria-label="编辑"
              title="编辑"
              @click="openEdit(wardrobe)"
            >
              <AppIcon name="pencil" :size="18" :stroke-width="3" />
            </button>

            <button
              class="icon-btn icon-btn--danger"
              type="button"
              aria-label="删除"
              title="删除"
              @click="handleRemove(wardrobe)"
            >
              <AppIcon name="trash" :size="18" :stroke-width="3" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <AppModal
      v-model="modalVisible"
      :title="modalTitle"
      subtitle="挑一个几何形状和一种撞色做标识"
      position="bottom"
      tone="yellow"
    >
      <div class="form">
        <AppInput
          v-model="form.name"
          label="衣柜名"
          :maxlength="NAME_MAX"
          placeholder="如：当季、老家"
          :error="formError"
          required
          clearable
        />

        <div class="form__block">
          <span class="m-label">标识形状</span>
          <div class="shapes" role="group" aria-label="标识形状">
            <button
              v-for="shape in WARDROBE_SHAPES"
              :key="shape"
              class="shapes__item"
              :class="[
                `shapes__item--tone-${currentTone}`,
                { 'shapes__item--active': form.icon === shape }
              ]"
              type="button"
              :aria-pressed="form.icon === shape"
              :aria-label="SHAPE_LABEL[shape]"
              :title="SHAPE_LABEL[shape]"
              @click="selectIcon(shape)"
            >
              <AppGeo :shape="shape" :color="currentTone" size="sm" />
            </button>
          </div>
        </div>

        <div class="form__block">
          <span class="m-label">标识撞色</span>
          <div class="tones" role="group" aria-label="标识撞色">
            <button
              v-for="tone in WARDROBE_TONES"
              :key="tone"
              class="tones__item"
              :class="[`tones__item--${tone}`, { 'tones__item--active': form.color === tone }]"
              type="button"
              :aria-pressed="form.color === tone"
              :aria-label="TONE_LABEL[tone]"
              :title="TONE_LABEL[tone]"
              @click="selectColor(tone)"
            >
              <span v-if="form.color === tone" class="tones__check">
                <AppIcon name="check" :size="16" :stroke-width="3.4" />
              </span>
            </button>
          </div>
        </div>

        <div class="preview">
          <span class="m-label preview__label">预览</span>
          <span class="preview__mark">
            <AppGeo :shape="form.icon" :color="currentTone" size="lg" />
          </span>
          <span class="preview__name ellipsis">{{ form.name || '未命名衣柜' }}</span>
        </div>
      </div>

      <template #footer>
        <AppButton type="secondary" @click="modalVisible = false">取消</AppButton>
        <AppButton :loading="saving" @click="handleSubmit">保存</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
/* ------------------------- 列表 ------------------------- */

.wardrobes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-4);
}

.wardrobes__item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wardrobes__main {
  display: flex;
  align-items: center;
  gap: var(--m-4);
  min-width: 0;
}

/* 标识底板：粗描边方块，几何形状居中 */
.wardrobes__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border: var(--m-line);
  background-color: var(--m-canvas);
  box-shadow: var(--m-shadow-xs);
}

.wardrobes__info {
  flex: 1;
  min-width: 0;
}

.wardrobes__name {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  font-size: var(--m-fs-h3);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
  color: var(--m-text);
}

/* 名称是 flex 项，必须允许收缩才能出省略号，避免把「默认」徽章顶出卡片 */
.wardrobes__name > .ellipsis {
  min-width: 0;
}

.wardrobes__meta {
  margin-top: 2px;
  font-size: var(--m-fs-sm);
  color: var(--m-text-muted);
}

.wardrobes__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--m-2);
  margin-top: var(--m-4);
  padding-top: var(--m-4);
  border-top: var(--m-line);
}

.wardrobes__default {
  min-height: 44px;
}

/* ------------------------- 图标按钮：44px 触摸目标 ------------------------- */

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover {
    background-color: var(--m-yellow);
    box-shadow: var(--m-shadow-sm);
  }
}

.icon-btn:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.icon-btn--danger {
  background-color: var(--m-red);
  color: var(--m-on-accent);
}

@media (hover: hover) and (pointer: fine) {
  .icon-btn--danger:hover {
    background-color: var(--m-pink);
  }
}

/* ------------------------- 弹窗表单 ------------------------- */

.form {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.form__block {
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
}

/* 形状选择器：粗描边方块按钮 */
.shapes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-3);
}

.shapes__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: var(--m-line);
  background-color: var(--m-surface);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .shapes__item:hover {
    box-shadow: var(--m-shadow-sm);
  }
}

.shapes__item:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

/* 选中态：与当前撞色形成对比的撞色底 + 硬阴影（避免同色叠同色看不清） */
.shapes__item--active {
  background-color: var(--shapes-pick, var(--m-yellow));
  box-shadow: var(--m-shadow-sm);
}

.shapes__item--tone-red {
  --shapes-pick: var(--m-cyan);
}

.shapes__item--tone-yellow {
  --shapes-pick: var(--m-red);
}

.shapes__item--tone-cyan {
  --shapes-pick: var(--m-pink);
}

.shapes__item--tone-pink {
  --shapes-pick: var(--m-cyan);
}

.shapes__item--tone-green {
  --shapes-pick: var(--m-yellow);
}

.shapes__item--tone-ink {
  --shapes-pick: var(--m-yellow);
}

/* 撞色选择器：方形色块按钮 */
.tones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-3);
}

.tones__item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: var(--m-line);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .tones__item:hover {
    box-shadow: var(--m-shadow-sm);
  }
}

.tones__item:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.tones__item--active {
  border-width: var(--m-bw-thick);
  box-shadow: var(--m-shadow-sm);
}

/* 对勾放在米白/墨色小方块里，任何撞色底与深浅主题下都看得清 */
.tones__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-canvas);
  color: var(--m-text);
}

/* 撞色令牌到具体色值的映射（禁止内联样式，统一写在这里） */
.tones__item--red {
  background-color: var(--m-red);
}

.tones__item--yellow {
  background-color: var(--m-yellow);
}

.tones__item--cyan {
  background-color: var(--m-cyan);
}

.tones__item--pink {
  background-color: var(--m-pink);
}

.tones__item--green {
  background-color: var(--m-green);
}

.tones__item--ink {
  background-color: var(--m-ink);
}

/* 预览行 */
.preview {
  display: flex;
  align-items: center;
  gap: var(--m-3);
  padding: var(--m-3) var(--m-4);
  border: var(--m-line);
  background-color: var(--m-surface-2);
}

.preview__label {
  flex: 0 0 auto;
}

.preview__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border: var(--m-line);
  background-color: var(--m-canvas);
}

.preview__name {
  flex: 1;
  min-width: 0;
  font-weight: var(--m-weight-black);
  color: var(--m-text);
}

/* ------------------------- 断点 ------------------------- */

@media (min-width: 640px) {
  .wardrobes {
    gap: var(--m-5);
  }
}

/* 桌面端：衣柜卡片排成两列（超宽屏三列） */
@media (min-width: 1024px) {
  .wardrobes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--m-6);
  }
}

@media (min-width: 1440px) {
  .wardrobes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
