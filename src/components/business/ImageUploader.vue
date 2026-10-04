/**
 * ImageUploader：图片上传器。
 * 负责选图、预览、删除与设置主图；瓦片用粗描边 + 硬阴影，主图额外加撞色顶条。
 */
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import AppIcon from '@/components/base/AppIcon.vue';
import { createObjectUrl, revokeObjectUrl } from '@/utils/blob';
import { useToast } from '@/composables/useToast';
import type { ImageUploaderState } from './types';

const props = withDefaults(
  defineProps<{
    /** 上传器状态（v-model） */
    modelValue: ImageUploaderState;
    /** 最多图片数量 */
    max?: number;
  }>(),
  {
    max: 9
  }
);

const emit = defineEmits<{
  /** 状态变化 */
  (event: 'update:modelValue', value: ImageUploaderState): void;
}>();

const toast = useToast();

/** 文件选择框引用 */
const inputRef = ref<HTMLInputElement | null>(null);
/** 新文件的本地预览 URL，与 modelValue.files 一一对应 */
const previews = ref<string[]>([]);

/** 当前总图片数 */
const total = computed(() => props.modelValue.existing.length + props.modelValue.files.length);
/** 是否还能继续添加 */
const canAdd = computed(() => total.value < props.max);

/** 主图标识（缺省时取第一张） */
const mainKey = computed(() => props.modelValue.mainKey ?? firstKey());

/**
 * 计算第一张图片的 key。
 * @returns 已有图片 id 或 `new:0`，无图时返回空串
 */
function firstKey(): string {
  if (props.modelValue.existing.length) return props.modelValue.existing[0].id;
  if (props.modelValue.files.length) return 'new:0';
  return '';
}

/**
 * 判断某个 key 是否为主图。
 * @param key 图片 key
 * @returns 是否主图
 */
function isMain(key: string): boolean {
  return mainKey.value === key;
}

/**
 * 把新文件转成预览 URL。
 * @param files 新选择的文件
 * @returns 预览 URL 数组
 */
function buildPreviews(files: File[]): string[] {
  return files.map((file) => createObjectUrl(file));
}

/** 释放全部预览 URL */
function releasePreviews(): void {
  for (const url of previews.value) revokeObjectUrl(url);
  previews.value = [];
}

watch(
  () => props.modelValue.files,
  (files) => {
    releasePreviews();
    previews.value = buildPreviews(files);
  },
  { immediate: true }
);

onUnmounted(releasePreviews);

/**
 * 触发文件选择。
 */
function pick(): void {
  inputRef.value?.click();
}

/**
 * 文件选择回调：过滤非图片、限制数量后追加。
 * @param event 输入事件
 */
function handleFiles(event: Event): void {
  const input = event.target as HTMLInputElement;
  const selected = Array.from(input.files ?? []);
  input.value = '';

  if (!selected.length) return;
  const images = selected.filter((file) => file.type.startsWith('image/'));
  if (!images.length) {
    toast.error('请选择图片文件');
    return;
  }

  const remain = props.max - total.value;
  if (remain <= 0) {
    toast.error(`最多只能上传 ${props.max} 张图片`);
    return;
  }
  if (images.length > remain) {
    toast.info(`最多还能添加 ${remain} 张，已自动截取`);
  }

  emit('update:modelValue', {
    ...props.modelValue,
    files: [...props.modelValue.files, ...images.slice(0, remain)]
  });
}

/**
 * 删除已有图片。
 * @param id 图片 id
 */
function removeExisting(id: string): void {
  const existing = props.modelValue.existing.filter((item) => item.id !== id);
  const nextMain = props.modelValue.mainKey === id ? undefined : props.modelValue.mainKey;
  emit('update:modelValue', { ...props.modelValue, existing, mainKey: nextMain });
}

/**
 * 删除新选择的文件。
 * @param index 文件下标
 */
function removeFile(index: number): void {
  const files = props.modelValue.files.filter((_, i) => i !== index);
  let nextMain = props.modelValue.mainKey;
  if (nextMain?.startsWith('new:')) {
    const currentIndex = Number.parseInt(nextMain.slice(4), 10);
    if (currentIndex === index) nextMain = undefined;
    else if (currentIndex > index) nextMain = `new:${currentIndex - 1}`;
  }
  emit('update:modelValue', { ...props.modelValue, files, mainKey: nextMain });
}

/**
 * 设置主图。
 * @param key 图片 key
 */
function setMain(key: string): void {
  emit('update:modelValue', { ...props.modelValue, mainKey: key });
}
</script>

<template>
  <div class="uploader">
    <div class="uploader__grid">
      <div
        v-for="item in props.modelValue.existing"
        :key="item.id"
        class="uploader__tile"
        :class="{ 'uploader__tile--main': isMain(item.id) }"
      >
        <img class="uploader__image" :src="item.url" alt="衣服图片" />
        <button
          class="uploader__remove"
          type="button"
          aria-label="删除这张图片"
          @click="removeExisting(item.id)"
        >
          <AppIcon name="close" :size="12" :stroke-width="3.4" />
        </button>
        <span v-if="isMain(item.id)" class="uploader__badge">主图</span>
        <button v-else class="uploader__set" type="button" @click="setMain(item.id)">设为主图</button>
      </div>

      <div
        v-for="(url, index) in previews"
        :key="`${url}-${index}`"
        class="uploader__tile"
        :class="{ 'uploader__tile--main': isMain(`new:${index}`) }"
      >
        <img class="uploader__image" :src="url" alt="待上传图片" />
        <button
          class="uploader__remove"
          type="button"
          aria-label="删除这张图片"
          @click="removeFile(index)"
        >
          <AppIcon name="close" :size="12" :stroke-width="3.4" />
        </button>
        <span v-if="isMain(`new:${index}`)" class="uploader__badge">主图</span>
        <button v-else class="uploader__set" type="button" @click="setMain(`new:${index}`)">设为主图</button>
      </div>

      <button v-if="canAdd" class="uploader__add" type="button" @click="pick">
        <AppIcon name="plus" :size="24" :stroke-width="3" />
        <span class="uploader__add-text">添加图片</span>
      </button>
    </div>

    <p class="m-hint uploader__hint">
      第一张默认为主图，最多 {{ props.max }} 张；图片会自动压缩后保存在本地。
    </p>

    <input
      ref="inputRef"
      class="uploader__input"
      type="file"
      accept="image/*"
      multiple
      @change="handleFiles"
    />
  </div>
</template>

<style scoped>
.uploader__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m-3);
}

@media (min-width: 700px) {
  .uploader__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--m-4);
  }
}

.uploader__tile {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: var(--m-line);
  background-color: var(--m-surface-2);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .uploader__tile:hover {
    box-shadow: var(--m-shadow-sm);
  }
}

/* 主图：加一圈内嵌撞色顶条，形状上也区别于普通图 */
.uploader__tile--main {
  border-width: var(--m-bw-thick);
  box-shadow: var(--m-shadow-sm);
}

.uploader__tile--main::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background-color: var(--m-cyan);
  border-bottom: 2px solid var(--m-line-color);
  z-index: 2;
}

.uploader__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploader__badge {
  position: absolute;
  left: 6px;
  top: 12px;
  padding: 1px 6px;
  border: 2px solid var(--m-line-color);
  background-color: var(--m-cyan);
  color: var(--m-on-accent);
  font-size: 11px;
  font-weight: var(--m-weight-black);
  z-index: 2;
}

.uploader__remove {
  position: absolute;
  top: 10px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  z-index: 2;
  transition: var(--m-transition);
}

.uploader__remove:hover {
  background-color: var(--m-red);
}

.uploader__set {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 5px 0;
  border: none;
  border-top: 2px solid var(--m-line-color);
  background-color: var(--m-yellow);
  color: var(--m-on-accent);
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-black);
  z-index: 2;
  transition: var(--m-transition);
}

.uploader__set:hover {
  background-color: var(--m-green);
}

.uploader__add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--m-2);
  aspect-ratio: 1;
  border: var(--m-line);
  border-style: dashed;
  background-color: var(--m-surface);
  color: var(--m-text-muted);
  transition: var(--m-transition);
}

@media (hover: hover) and (pointer: fine) {
  .uploader__add:hover {
    background-color: var(--m-yellow);
    color: var(--m-ink);
    box-shadow: var(--m-shadow-sm);
  }
}

.uploader__add:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.uploader__add-text {
  font-size: var(--m-fs-xs);
  font-weight: var(--m-weight-bold);
}

.uploader__hint {
  margin-top: var(--m-3);
  line-height: 1.6;
}

.uploader__input {
  display: none;
}
</style>
