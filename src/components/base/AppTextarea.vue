/**
 * AppTextarea：孟菲斯多行输入，带字数统计。
 */
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 文本值（v-model） */
    modelValue: string;
    /** 字段标签 */
    label?: string;
    /** 占位文案 */
    placeholder?: string;
    /** 显示行数 */
    rows?: number;
    /** 最大长度 */
    maxlength?: number;
    /** 错误提示 */
    error?: string;
    /** 是否禁用 */
    disabled?: boolean;
  }>(),
  {
    label: '',
    placeholder: '',
    rows: 4,
    maxlength: 200,
    error: '',
    disabled: false
  }
);

const emit = defineEmits<{
  /** 值变化 */
  (event: 'update:modelValue', value: string): void;
}>();

/** 字数统计文案 */
const counter = computed(() => `${props.modelValue.length}/${props.maxlength}`);

/**
 * 输入事件：同步 v-model。
 * @param event 输入事件
 */
function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <label class="textarea">
    <span v-if="props.label" class="m-label textarea__label">{{ props.label }}</span>

    <span
      class="m-field textarea__field"
      :class="{ 'm-field--error': Boolean(props.error), 'm-field--disabled': props.disabled }"
    >
      <textarea
        class="m-textarea"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :rows="props.rows"
        :maxlength="props.maxlength"
        :disabled="props.disabled"
        :aria-invalid="Boolean(props.error) || undefined"
        @input="handleInput"
      />
    </span>

    <span class="textarea__foot">
      <span v-if="props.error" class="m-error">{{ props.error }}</span>
      <span class="m-hint textarea__counter m-mono">{{ counter }}</span>
    </span>
  </label>
</template>

<style scoped>
.textarea {
  display: block;
  width: 100%;
}

.textarea__label {
  margin-bottom: var(--m-2);
}

.textarea__field {
  display: block;
}

.textarea__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m-3);
  margin-top: var(--m-2);
  min-height: 18px;
}

.textarea__counter {
  margin-left: auto;
}
</style>
