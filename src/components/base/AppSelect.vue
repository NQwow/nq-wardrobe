/**
 * AppSelect：孟菲斯下拉选择。
 * 原生 select 去掉系统外观，右侧补一个几何箭头。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { SelectOption } from './types';

const props = withDefaults(
  defineProps<{
    /** 当前值（v-model） */
    modelValue: string;
    /** 选项列表 */
    options: SelectOption[];
    /** 字段标签 */
    label?: string;
    /** 占位文案（值为空时显示） */
    placeholder?: string;
    /** 错误提示 */
    error?: string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否必填（仅用于在标签上加星号） */
    required?: boolean;
  }>(),
  {
    label: '',
    placeholder: '请选择',
    error: '',
    disabled: false,
    required: false
  }
);

const emit = defineEmits<{
  /** 值变化 */
  (event: 'update:modelValue', value: string): void;
}>();

/** 当前选中项是否已存在于选项中（不存在时补一个占位项） */
const hasCurrent = computed(() => props.options.some((item) => item.value === props.modelValue));

/**
 * 选择事件：同步 v-model。
 * @param event 变更事件
 */
function handleChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <label class="select">
    <span v-if="props.label" class="m-label select__label">
      {{ props.label }}
      <span v-if="props.required" class="m-label__required" aria-hidden="true">*</span>
    </span>

    <span
      class="m-field select__field"
      :class="{ 'm-field--error': Boolean(props.error), 'm-field--disabled': props.disabled }"
    >
      <select
        class="m-select"
        :value="props.modelValue"
        :disabled="props.disabled"
        :aria-invalid="Boolean(props.error) || undefined"
        @change="handleChange"
      >
        <option v-if="!hasCurrent" value="" disabled>{{ props.placeholder }}</option>
        <option v-for="option in props.options" :key="option.value" :value="option.value" :disabled="option.disabled">
          {{ option.label }}
        </option>
      </select>
      <AppIcon class="select__arrow" name="chevron-down" :size="18" :stroke-width="3" />
    </span>

    <span v-if="props.error" class="m-error select__msg">{{ props.error }}</span>
  </label>
</template>

<style scoped>
.select {
  display: block;
  width: 100%;
}

.select__label {
  margin-bottom: var(--m-2);
}

.select__field {
  position: relative;
}

.select__arrow {
  position: absolute;
  right: var(--m-4);
  color: var(--m-text);
  pointer-events: none;
}

.select__msg {
  margin-top: var(--m-2);
}
</style>
