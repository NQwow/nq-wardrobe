/**
 * TagPicker：单个标签类型的选择器。
 * 支持一级/二级分类、现场新建标签；颜色类标签额外显示色块。
 */
<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppModal from '@/components/base/AppModal.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import type { SelectOption } from '@/components/base/types';
import { useToast } from '@/composables/useToast';
import { useTagStore } from '@/stores';
import { TAG_TYPE_LABEL, type TagType } from '@/models';

const props = withDefaults(
  defineProps<{
    /** 已选中的标签 id（v-model） */
    modelValue: string[];
    /** 标签类型 */
    type: TagType;
    /** 分组标题，缺省时取类型名 */
    title?: string;
    /** 是否必选（影响星号与提示） */
    required?: boolean;
    /** 是否可折叠（默认展开） */
    collapsible?: boolean;
    /** 错误提示 */
    error?: string;
  }>(),
  {
    title: '',
    required: false,
    collapsible: false,
    error: ''
  }
);

const emit = defineEmits<{
  /** 选中项变化 */
  (event: 'update:modelValue', value: string[]): void;
}>();

const tagStore = useTagStore();
const toast = useToast();

/** 是否折叠 */
const collapsed = ref(false);
/** 新建标签弹窗显隐 */
const createVisible = ref(false);
/** 新标签名 */
const newName = ref('');
/** 新标签父级 id（空串表示作为一级标签） */
const newParentId = ref('');
/** 新建中 */
const creating = ref(false);
/** 新建失败提示 */
const createError = ref('');

/** 分组标题 */
const heading = computed(() => props.title || TAG_TYPE_LABEL[props.type]);

/** 当前类型的标签树 */
const tree = computed(() => tagStore.tree[props.type] ?? []);

/** 已选中的标签名列表（用于折叠时回显） */
const selectedNames = computed(() =>
  props.modelValue.map((id) => tagStore.nameOf(id)).filter(Boolean).join('、')
);

/** 新建时可选的父标签 */
const parentOptions = computed<SelectOption[]>(() => [
  { value: '', label: '无（作为一级标签）' },
  ...tree.value.map((node) => ({ value: node.tag.id, label: node.tag.name }))
]);

/**
 * 判断标签是否被选中。
 * @param tagId 标签 id
 * @returns 是否选中
 */
function isSelected(tagId: string): boolean {
  return props.modelValue.includes(tagId);
}

/**
 * 切换标签选中状态。
 * @param tagId 标签 id
 */
function toggle(tagId: string): void {
  const next = isSelected(tagId)
    ? props.modelValue.filter((id) => id !== tagId)
    : [...props.modelValue, tagId];
  emit('update:modelValue', next);
}

/**
 * 打开新建标签弹窗。
 */
function openCreate(): void {
  newName.value = '';
  newParentId.value = '';
  createError.value = '';
  createVisible.value = true;
}

/**
 * 提交新建标签，并把新标签自动勾选。
 */
async function submitCreate(): Promise<void> {
  creating.value = true;
  createError.value = '';
  try {
    const created = await tagStore.create({
      name: newName.value,
      type: props.type,
      parentId: newParentId.value || undefined
    });
    emit('update:modelValue', [...props.modelValue, created.id]);
    createVisible.value = false;
    toast.success(`已新建标签「${created.name}」`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '新建标签失败';
    createError.value = message;
    toast.error(message);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <section class="picker">
    <header class="picker__head">
      <button
        class="picker__heading"
        type="button"
        :disabled="!props.collapsible"
        :aria-expanded="props.collapsible ? !collapsed : undefined"
        @click="collapsed = !collapsed"
      >
        <span class="picker__mark" :class="`picker__mark--${props.type}`" aria-hidden="true" />
        <span class="picker__title">
          {{ heading }}
          <span v-if="props.required" class="picker__required" aria-hidden="true">*</span>
        </span>
        <AppIcon
          v-if="props.collapsible"
          class="picker__caret"
          :class="{ 'picker__caret--open': !collapsed }"
          name="chevron-down"
          :size="14"
          :stroke-width="3"
        />
      </button>

      <button class="picker__create" type="button" @click="openCreate">
        <AppIcon name="plus" :size="13" :stroke-width="3.2" />
        新建
      </button>
    </header>

    <p v-if="collapsed && selectedNames" class="picker__summary ellipsis">{{ selectedNames }}</p>

    <div v-show="!collapsed" class="picker__body">
      <div v-for="node in tree" :key="node.tag.id" class="picker__group">
        <button
          class="picker__chip"
          :class="{ 'picker__chip--on': isSelected(node.tag.id) }"
          type="button"
          :aria-pressed="isSelected(node.tag.id)"
          @click="toggle(node.tag.id)"
        >
          <span v-if="props.type === 'color' && node.tag.color" class="picker__swatch" :data-color="node.tag.color" />
          {{ node.tag.name }}
        </button>

        <button
          v-for="child in node.children"
          :key="child.id"
          class="picker__chip picker__chip--child"
          :class="{ 'picker__chip--on': isSelected(child.id) }"
          type="button"
          :aria-pressed="isSelected(child.id)"
          @click="toggle(child.id)"
        >
          {{ child.name }}
        </button>
      </div>

      <p v-if="!tree.length" class="m-hint">该分类下还没有标签，点右上角「新建」添加。</p>
    </div>

    <p v-if="props.error" class="m-error picker__error">{{ props.error }}</p>

    <AppModal v-model="createVisible" :title="`新建${heading}标签`" tone="pink">
      <div class="picker__form">
        <AppInput v-model="newName" label="标签名" placeholder="如：针织衫" :maxlength="8" :error="createError" />
        <AppSelect v-model="newParentId" label="父标签" :options="parentOptions" />
        <div class="picker__tip">
          <AppGeo shape="diamond" color="yellow" size="xs" />
          <span>选一个父标签就会成为二级标签，最多两级。</span>
        </div>
      </div>
      <template #footer>
        <AppButton type="secondary" tone="cyan" @click="createVisible = false">取消</AppButton>
        <AppButton tone="green" :loading="creating" @click="submitCreate">确定</AppButton>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.picker {
  padding: var(--m-4) 0;
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m-3);
}

.picker__heading {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--m-text);
  font-size: var(--m-fs-body);
  font-weight: var(--m-weight-black);
  letter-spacing: -0.01em;
}

.picker__heading:disabled {
  cursor: default;
}

/* 类型色标：每个标签类型一个撞色方块 */
.picker__mark {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-red);
}

.picker__mark--category {
  background-color: var(--m-red);
}

.picker__mark--season {
  background-color: var(--m-green);
}

.picker__mark--color {
  background-color: var(--m-cyan);
}

.picker__mark--style {
  background-color: var(--m-pink);
}

.picker__mark--occasion {
  background-color: var(--m-yellow);
}

.picker__mark--material {
  background-color: var(--m-green);
}

.picker__mark--custom {
  background-color: var(--m-pink);
}

.picker__required {
  color: var(--m-danger);
}

.picker__caret {
  color: var(--m-text-muted);
  transition: transform var(--m-dur) var(--m-ease);
}

.picker__caret--open {
  transform: rotate(180deg);
}

.picker__create {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-black);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .picker__create:hover {
    background-color: var(--m-yellow);
    box-shadow: var(--m-shadow-sm);
  }
}

.picker__create:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.picker__summary {
  margin-top: var(--m-2);
  font-size: var(--m-fs-sm);
  color: var(--m-text-muted);
}

.picker__body {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
  margin-top: var(--m-3);
}

.picker__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--m-2);
  padding: 3px;
  border: var(--m-bw) dashed var(--m-line-color);
}

.picker__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  font-size: var(--m-fs-sm);
  font-weight: var(--m-weight-bold);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .picker__chip:hover {
    background-color: var(--m-yellow);
    color: var(--m-ink);
  }
}

.picker__chip:active {
  transform: translate(2px, 2px);
}

/* 选中：实心撞色 + 粗体 */
.picker__chip--on {
  background-color: var(--m-cyan);
  color: var(--m-ink);
  font-weight: var(--m-weight-black);
  box-shadow: var(--m-shadow-xs);
}

.picker__chip--child {
  font-size: var(--m-fs-xs);
  border-style: dashed;
  color: var(--m-text-soft);
}

.picker__chip--child.picker__chip--on {
  border-style: solid;
  background-color: var(--m-pink);
  color: var(--m-ink);
}

.picker__swatch {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-surface);
}

/* 颜色标签色块：按预设色值映射到类，避免内联样式 */
.picker__swatch[data-color='#1a1a1a'] {
  background-color: #1a1a1a;
}
.picker__swatch[data-color='#ffffff'] {
  background-color: #ffffff;
}
.picker__swatch[data-color='#9e9e9e'] {
  background-color: #9e9e9e;
}
.picker__swatch[data-color='#e74c3c'] {
  background-color: #e74c3c;
}
.picker__swatch[data-color='#ff9ec4'] {
  background-color: #ff9ec4;
}
.picker__swatch[data-color='#ff9f43'] {
  background-color: #ff9f43;
}
.picker__swatch[data-color='#f7d154'] {
  background-color: #f7d154;
}
.picker__swatch[data-color='#2ecc71'] {
  background-color: #2ecc71;
}
.picker__swatch[data-color='#3d8bfd'] {
  background-color: #3d8bfd;
}
.picker__swatch[data-color='#9b59b6'] {
  background-color: #9b59b6;
}
.picker__swatch[data-color='#8d6e63'] {
  background-color: #8d6e63;
}
.picker__swatch[data-color='#efe3c8'] {
  background-color: #efe3c8;
}

.picker__error {
  margin-top: var(--m-2);
}

.picker__form {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.picker__tip {
  display: flex;
  align-items: center;
  gap: var(--m-2);
  padding: var(--m-3);
  border: var(--m-line);
  background-color: var(--m-surface-2);
  font-size: var(--m-fs-xs);
  color: var(--m-text-soft);
}
</style>
