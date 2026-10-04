/**
 * TagManageView：标签管理页（孟菲斯风格）。
 * 按标签类型分组展示一级 / 二级标签，支持新增、改名改色与删除自定义标签。
 * 全部视觉走 --m-* 令牌与全局孟菲斯类，页面内不出现任何 emoji。
 */
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppModal from '@/components/base/AppModal.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import AppTabs from '@/components/base/AppTabs.vue';
import type { GeoColor, GeoOrbit, SelectOption, TabItem } from '@/components/base/types';
import PageHeader from '@/components/business/PageHeader.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { useTagStore } from '@/stores';
import { TAG_TYPES, TAG_TYPE_LABEL, type Tag, type TagType } from '@/models';
import { validateTagName } from '@/utils/validate';

/** 标签表单数据 */
interface TagForm {
  /** 标签名 */
  name: string;
  /** 父标签 id，空串表示作为一级标签 */
  parentId: string;
  /** 展示颜色，空串表示不设置 */
  color: string;
}

/** 预设色块：色值写入数据，样式写在 scoped CSS 的 class 里（禁止内联 style） */
interface ColorPreset {
  /** 色值 */
  value: string;
  /** 对应的 CSS 类名 */
  className: string;
  /** 中文名（用于 title 与无障碍标签） */
  label: string;
}

/** 标签名最大长度 */
const NAME_MAX = 8;

/** 「无父标签」选项值 */
const NO_PARENT = '';

/** 预设颜色（颜色类标签用） */
const COLOR_PRESETS: ColorPreset[] = [
  { value: '#1a1a1a', className: 'color--black', label: '黑色' },
  { value: '#ffffff', className: 'color--white', label: '白色' },
  { value: '#9e9e9e', className: 'color--gray', label: '灰色' },
  { value: '#e74c3c', className: 'color--red', label: '红色' },
  { value: '#ff9ec4', className: 'color--pink', label: '粉色' },
  { value: '#ff9f43', className: 'color--orange', label: '橙色' },
  { value: '#f7d154', className: 'color--yellow', label: '黄色' },
  { value: '#2ecc71', className: 'color--green', label: '绿色' },
  { value: '#3d8bfd', className: 'color--blue', label: '蓝色' },
  { value: '#9b59b6', className: 'color--purple', label: '紫色' },
  { value: '#8d6e63', className: 'color--brown', label: '棕色' },
  { value: '#efe3c8', className: 'color--beige', label: '米色' }
];

/** 各类标签的选中撞色（不同用途不同撞色） */
const TAB_TONE: Record<TagType, GeoColor> = {
  category: 'cyan',
  season: 'green',
  color: 'pink',
  style: 'yellow',
  occasion: 'red',
  material: 'green',
  custom: 'cyan'
};

/** 分组卡片的装饰撞色（按序号轮换，避免整页同一色） */
const DECO_TONES: GeoColor[] = ['yellow', 'cyan', 'pink', 'green', 'red'];

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

/**
 * 取分组装饰的漂移方向（1~3 轮换）。
 * @param index 分组序号
 * @returns 漂移方向令牌
 */
function orbitOf(index: number): GeoOrbit {
  return ((index % 3) + 1) as GeoOrbit;
}

/**
 * 取分组装饰的撞色。
 * @param index 分组序号
 * @returns 撞色令牌
 */
function decoToneOf(index: number): GeoColor {
  return DECO_TONES[index % DECO_TONES.length];
}

const toast = useToast();
const confirmDialog = useConfirm();
const tagStore = useTagStore();

/** 当前选中的标签类型 */
const activeType = ref<TagType>('category');
/** 弹窗是否显示 */
const modalVisible = ref(false);
/** 正在编辑的标签 id，空串表示新增 */
const editingId = ref('');
/** 表单数据 */
const form = ref<TagForm>({ name: '', parentId: NO_PARENT, color: '' });
/** 表单校验错误 */
const formError = ref('');
/** 保存中 */
const saving = ref(false);

/** 类型切换 Tab */
const tabs = computed<TabItem[]>(() =>
  TAG_TYPES.map((type) => ({ key: type, label: TAG_TYPE_LABEL[type], badge: tagStore.byType[type].length }))
);

/** 当前类型 Tab 的选中撞色 */
const tabTone = computed<GeoColor>(() => TAB_TONE[activeType.value]);

/** 当前类型的一级/二级树 */
const treeNodes = computed(() => tagStore.tree[activeType.value]);

/** 当前类型是否没有任何标签 */
const isEmpty = computed<boolean>(() => treeNodes.value.length === 0);

/** 父标签选项：当前类型下的一级标签 + 「无」 */
const parentOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [{ value: NO_PARENT, label: '无（作为一级标签）' }];
  for (const node of treeNodes.value) {
    options.push({ value: node.tag.id, label: node.tag.name });
  }
  return options;
});

/** 是否展示颜色选择（仅颜色类标签） */
const showColorPicker = computed<boolean>(() => activeType.value === 'color');

/** 弹窗标题 */
const modalTitle = computed<string>(() => (editingId.value ? '编辑标签' : '新增标签'));

/**
 * 加载标签列表。
 */
async function ensureLoaded(): Promise<void> {
  try {
    await tagStore.load();
  } catch (error) {
    toast.error(toMessage(error, '标签加载失败'));
  }
}

/**
 * 切换标签类型。
 * @param key 类型键（TagType）
 */
function handleTabChange(key: string): void {
  activeType.value = key as TagType;
}

/**
 * 取颜色对应的样式 class。
 * @param color 标签颜色 hex，可能为空或渐变
 * @returns CSS 类名；未匹配预设时返回「其它颜色」样式
 */
function colorClassOf(color?: string): string {
  const preset = COLOR_PRESETS.find((item) => item.value === color);
  return preset ? preset.className : 'color--other';
}

/**
 * 打开新增弹窗。
 */
function openCreate(): void {
  editingId.value = '';
  form.value = {
    name: '',
    parentId: NO_PARENT,
    color: showColorPicker.value ? COLOR_PRESETS[0].value : ''
  };
  formError.value = '';
  modalVisible.value = true;
}

/**
 * 打开编辑弹窗。
 * @param tag 待编辑的标签
 */
function openEdit(tag: Tag): void {
  editingId.value = tag.id;
  form.value = { name: tag.name, parentId: tag.parentId ?? NO_PARENT, color: tag.color ?? '' };
  formError.value = '';
  modalVisible.value = true;
}

/**
 * 切换父标签。
 * @param value 父标签 id（空串表示一级标签）
 */
function handleParentChange(value: string): void {
  form.value.parentId = value;
}

/**
 * 选择颜色。
 * @param color 色值
 */
function selectColor(color: string): void {
  form.value.color = color;
}

/**
 * 清除已选颜色。
 */
function clearColor(): void {
  form.value.color = '';
}

/**
 * 保存标签（新增或编辑）。
 */
async function handleSubmit(): Promise<void> {
  const parentId = form.value.parentId ? form.value.parentId : undefined;
  const siblings = tagStore.list.filter(
    (item) => item.type === activeType.value && item.parentId === parentId && item.id !== editingId.value
  );
  const error = validateTagName(form.value.name, siblings.map((item) => item.name));
  if (error) {
    formError.value = error;
    return;
  }
  formError.value = '';
  saving.value = true;
  try {
    if (editingId.value) {
      await tagStore.update(editingId.value, {
        name: form.value.name.trim(),
        color: form.value.color ? form.value.color : undefined
      });
      toast.success('标签已更新');
    } else {
      await tagStore.create({
        name: form.value.name.trim(),
        type: activeType.value,
        parentId,
        color: form.value.color ? form.value.color : undefined
      });
      toast.success('标签已创建');
    }
    modalVisible.value = false;
  } catch (err) {
    toast.error(toMessage(err, '标签保存失败'));
  } finally {
    saving.value = false;
  }
}

/**
 * 删除标签：预设标签不可删除，一级标签会连同其二级标签一起删除。
 * @param tag 待删除的标签
 * @param childCount 该标签下的二级标签数量
 */
async function handleRemove(tag: Tag, childCount: number): Promise<void> {
  if (tag.isPreset) {
    toast.error('预设标签不可删除');
    return;
  }

  const message =
    childCount > 0
      ? `删除「${tag.name}」会同时删除其下的 ${childCount} 个二级标签，且不可恢复。确定继续吗？`
      : `确定删除标签「${tag.name}」吗？删除后不可恢复。`;

  try {
    const confirmed = await confirmDialog.confirm({
      title: '删除标签',
      message,
      confirmText: '删除',
      danger: true
    });
    if (!confirmed) return;

    const removed = await tagStore.remove(tag.id);
    toast.success(removed.length > 1 ? `已删除 ${removed.length} 个标签` : '标签已删除');
  } catch (error) {
    toast.error(toMessage(error, '标签删除失败'));
  }
}

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <div class="page page--with-header">
    <PageHeader title="标签管理" :back="true" subtitle="按类型分组，支持一级与二级">
      <AppButton size="sm" icon="plus" @click="openCreate">新增标签</AppButton>
    </PageHeader>

    <div class="page__body">
      <AppTabs
        class="tags__tabs"
        :model-value="activeType"
        :tabs="tabs"
        :tone="tabTone"
        stretch
        @update:model-value="handleTabChange"
      />

      <!-- 一级标签作为分组卡片：桌面端两列 / 超宽屏三列，手机端单列 -->
      <div v-if="!isEmpty" class="groups">
        <section
          v-for="(node, index) in treeNodes"
          :key="node.tag.id"
          class="m-card m-card--pad group"
        >
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo
              shape="diamond"
              :color="decoToneOf(index)"
              size="sm"
              :orbit="orbitOf(index)"
              at="tr"
            />
          </div>

          <div class="group__row">
            <span class="tag-chip tag-chip--root">
              <span
                v-if="node.tag.color"
                class="swatch"
                :class="colorClassOf(node.tag.color)"
                aria-hidden="true"
              />
              <span class="tag-chip__name ellipsis">{{ node.tag.name }}</span>
              <span v-if="node.tag.isPreset" class="m-badge m-badge--ink">预设</span>
            </span>

            <span v-if="node.children.length" class="m-badge m-badge--cyan group__count">
              {{ node.children.length }} 个子标签
            </span>

            <span class="group__actions">
              <button
                class="icon-btn"
                type="button"
                aria-label="编辑标签"
                title="编辑"
                @click="openEdit(node.tag)"
              >
                <AppIcon name="pencil" :size="18" :stroke-width="3" />
              </button>

              <button
                v-if="!node.tag.isPreset"
                class="icon-btn icon-btn--danger"
                type="button"
                aria-label="删除标签"
                title="删除"
                @click="handleRemove(node.tag, node.children.length)"
              >
                <AppIcon name="trash" :size="18" :stroke-width="3" />
              </button>
            </span>
          </div>

          <ul v-if="node.children.length" class="group__children">
            <li v-for="child in node.children" :key="child.id" class="group__child">
              <span class="tag-chip tag-chip--child">
                <span
                  v-if="child.color"
                  class="swatch"
                  :class="colorClassOf(child.color)"
                  aria-hidden="true"
                />
                <span class="tag-chip__name ellipsis">{{ child.name }}</span>
                <span v-if="child.isPreset" class="m-badge m-badge--ink">预设</span>
              </span>

              <span class="group__actions">
                <button
                  class="icon-btn"
                  type="button"
                  aria-label="编辑标签"
                  title="编辑"
                  @click="openEdit(child)"
                >
                  <AppIcon name="pencil" :size="18" :stroke-width="3" />
                </button>

                <button
                  v-if="!child.isPreset"
                  class="icon-btn icon-btn--danger"
                  type="button"
                  aria-label="删除标签"
                  title="删除"
                  @click="handleRemove(child, 0)"
                >
                  <AppIcon name="trash" :size="18" :stroke-width="3" />
                </button>
              </span>
            </li>
          </ul>
        </section>
      </div>

      <AppEmpty
        v-else
        motif="tag"
        title="这个分类下还没有标签"
        description="自定义标签可以随时新增、改名或删除"
      >
        <AppButton icon="plus" @click="openCreate">新增标签</AppButton>
      </AppEmpty>
    </div>

    <AppModal v-model="modalVisible" :title="modalTitle" position="bottom" tone="pink">
      <div class="form">
        <AppInput
          v-model="form.name"
          label="标签名"
          :maxlength="NAME_MAX"
          placeholder="如：短袖"
          :error="formError"
          required
          clearable
        />

        <div v-if="!editingId" class="form__block">
          <AppSelect
            label="父标签"
            :model-value="form.parentId"
            :options="parentOptions"
            @update:model-value="handleParentChange"
          />
          <span class="m-hint">选择父标签后，该标签会作为其二级标签展示</span>
        </div>

        <div v-if="showColorPicker" class="form__block">
          <span class="m-label">颜色</span>
          <div class="swatches" role="group" aria-label="标签颜色">
            <button
              v-for="preset in COLOR_PRESETS"
              :key="preset.value"
              class="swatches__item"
              :class="[preset.className, { 'swatches__item--active': form.color === preset.value }]"
              type="button"
              :aria-pressed="form.color === preset.value"
              :title="preset.label"
              :aria-label="preset.label"
              @click="selectColor(preset.value)"
            />
          </div>
          <AppButton
            v-if="form.color"
            class="form__clear"
            type="secondary"
            tone="red"
            size="sm"
            icon="close"
            @click="clearColor"
          >
            清除颜色
          </AppButton>
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
/* ------------------------- 分组卡片网格 ------------------------- */

.tags__tabs {
  margin-bottom: var(--m-5);
}

.groups {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-4);
}

.group {
  overflow: hidden;
}

/* 分组标题行：标签芯片 + 子标签数 + 操作按钮，空间不足时自动换行 */
.group__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--m-2);
}

.group__count {
  flex: 0 0 auto;
}

.group__actions {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  margin-left: auto;
}

/* 二级标签：缩进 + 虚线描边 */
.group__children {
  display: flex;
  flex-direction: column;
  gap: var(--m-2);
  margin-top: var(--m-3);
  padding-left: var(--m-3);
}

.group__child {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--m-2);
}

/* ------------------------- 标签芯片 ------------------------- */

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--m-2);
  min-width: 0;
  max-width: 100%;
  min-height: 40px;
  padding: var(--m-1) var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-sm);
  transition: var(--m-transition);
}

/* 一级标签：加粗 */
.tag-chip--root {
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
}

/* 二级标签：虚线描边 + 浅底（描边宽度跟 --m-bw 走，不使用细边框） */
.tag-chip--child {
  border: var(--m-bw) dashed var(--m-line-color);
  background-color: var(--m-surface-2);
  font-weight: var(--m-weight-body);
}

.tag-chip__name {
  min-width: 0;
}

/* 颜色类标签的方形色块（色值到 class 的映射，未匹配时用灰白方块） */
.swatch {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border: 2px solid var(--m-line-color);
}

/* ------------------------- 操作按钮：44px 触摸目标 ------------------------- */

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

.form__clear {
  align-self: flex-start;
  min-height: 44px;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-3);
}

.swatches__item {
  width: 44px;
  height: 44px;
  border: var(--m-line);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .swatches__item:hover {
    box-shadow: var(--m-shadow-sm);
  }
}

.swatches__item:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}

.swatches__item--active {
  border-width: var(--m-bw-thick);
  box-shadow: var(--m-shadow-sm);
}

/* 预设颜色：禁止内联样式，统一写在这里 */
.color--black {
  background-color: #1a1a1a;
}

.color--white {
  background-color: #ffffff;
}

.color--gray {
  background-color: #9e9e9e;
}

.color--red {
  background-color: #e74c3c;
}

.color--pink {
  background-color: #ff9ec4;
}

.color--orange {
  background-color: #ff9f43;
}

.color--yellow {
  background-color: #f7d154;
}

.color--green {
  background-color: #2ecc71;
}

.color--blue {
  background-color: #3d8bfd;
}

.color--purple {
  background-color: #9b59b6;
}

.color--brown {
  background-color: #8d6e63;
}

.color--beige {
  background-color: #efe3c8;
}

/* 「多色」等自定义 / 未匹配的色值：默认灰白方块 */
.color--other {
  background-color: var(--m-surface-2);
}

/* ------------------------- 断点 ------------------------- */

@media (min-width: 640px) {
  .groups {
    gap: var(--m-5);
  }
}

/* 桌面端：一级标签分组两列，超宽屏三列 */
@media (min-width: 1024px) {
  .groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--m-6);
    align-items: start;
  }
}

@media (min-width: 1440px) {
  .groups {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
