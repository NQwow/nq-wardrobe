/**
 * AppInput：孟菲斯输入框。
 * 粗描边外壳，聚焦时生长出硬阴影；错误态用红色描边 + 「!」方块双重表达。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { IconName } from './types';

const props = withDefaults(
  defineProps<{
    /** 输入值（v-model） */
    modelValue: string;
    /** 字段标签 */
    label?: string;
    /** 占位文案 */
    placeholder?: string;
    /** 原生输入类型 */
    type?: 'text' | 'number' | 'password' | 'search' | 'date' | 'tel';
    /** 最大长度 */
    maxlength?: number;
    /** 错误提示，非空时输入框标红 */
    error?: string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否显示清空按钮 */
    clearable?: boolean;
    /** 输入框辅助说明 */
    hint?: string;
    /** 左侧图标 */
    icon?: IconName;
    /** 是否必填（仅用于在标签上加星号） */
    required?: boolean;
  }>(),
  {
    label: '',
    placeholder: '',
    type: 'text',
    maxlength: undefined,
    error: '',
    disabled: false,
    clearable: false,
    hint: '',
    icon: undefined,
    required: false
  }
);

const emit = defineEmits<{
  /** 值变化 */
  (event: 'update:modelValue', value: string): void;
  /** 回车提交 */
  (event: 'enter'): void;
  /** 清空 */
  (event: 'clear'): void;
}>();

/** 是否展示清空按钮 */
const showClear = computed(() => props.clearable && props.modelValue.length > 0 && !props.disabled);

/**
 * 输入事件：同步 v-model。
 * @param event 输入事件
 */
function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

/** 清空输入 */
function handleClear(): void {
  emit('update:modelValue', '');
  emit('clear');
}
</script>

<template>
  <label class="input">
    <span v-if="props.label" class="m-label input__label">
      {{ props.label }}
      <span v-if="props.required" class="m-label__required" aria-hidden="true">*</span>
    </span>

    <span
      class="m-field input__field"
      :class="{ 'm-field--error': Boolean(props.error), 'm-field--disabled': props.disabled }"
    >
      <AppIcon v-if="props.icon" class="input__icon" :name="props.icon" :size="18" />
      <input
        class="m-input"
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :maxlength="props.maxlength"
        :disabled="props.disabled"
        :aria-invalid="Boolean(props.error) || undefined"
        @input="handleInput"
        @keyup.enter="emit('enter')"
      />
      <button
        v-if="showClear"
        class="input__clear"
        type="button"
        aria-label="清空"
        @click.prevent="handleClear"
      >
        <AppIcon name="close" :size="13" :stroke-width="3" />
      </button>
    </span>

    <span v-if="props.error" class="m-error input__msg">{{ props.error }}</span>
    <span v-else-if="props.hint" class="m-hint input__msg">{{ props.hint }}</span>
  </label>
</template>

<style scoped>
.input {
  display: block;
  width: 100%;
}

.input__label {
  margin-bottom: var(--m-2);
}

.input__icon {
  margin-left: var(--m-4);
  color: var(--m-text-muted);
}

.input__field:focus-within .input__icon {
  color: var(--m-text);
}

.input__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: var(--m-3);
  flex: 0 0 auto;
  border: var(--m-line);
  border-radius: 50%;
  background-color: var(--m-surface);
  color: var(--m-text);
  transition: var(--m-transition);
}

.input__clear:hover {
  background-color: var(--m-red);
}

.input__msg {
  margin-top: var(--m-2);
}
</style>
