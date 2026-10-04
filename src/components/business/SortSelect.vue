/**
 * SortSelect：排序方式下拉选择，选项来自 SORT_KEY_LABEL。
 */
<script setup lang="ts">
import { computed } from 'vue';
import AppSelect from '@/components/base/AppSelect.vue';
import type { SelectOption } from '@/components/base/types';
import { SORT_KEY_LABEL, type SortKey } from '@/models';

const props = defineProps<{
  /** 当前排序方式（v-model） */
  modelValue: SortKey;
  /** 字段标签，留空则不显示 */
  label?: string;
}>();

const emit = defineEmits<{
  /** 排序方式变化 */
  (event: 'update:modelValue', value: SortKey): void;
}>();

/** 下拉选项 */
const options = computed<SelectOption[]>(() =>
  (Object.keys(SORT_KEY_LABEL) as SortKey[]).map((key) => ({ value: key, label: SORT_KEY_LABEL[key] }))
);

/**
 * 选择变化：把字符串收窄回 SortKey。
 * @param value 选中的键
 */
function handleChange(value: string): void {
  emit('update:modelValue', value as SortKey);
}
</script>

<template>
  <AppSelect
    :model-value="props.modelValue"
    :options="options"
    :label="props.label"
    @update:model-value="handleChange"
  />
</template>
