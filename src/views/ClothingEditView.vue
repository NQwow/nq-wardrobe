<!--
  ClothingEditView：新增与编辑衣服共用的表单页。
  孟菲斯风格：粗黑描边 + 硬阴影 + 几何装饰；内容列收窄到 --m-reading。
  布局：移动端单列 + 底部固定操作条；≥700px「图片 / 基本信息」两列，标签与备注整行；≥1024px 操作条回到表单末尾。
  业务逻辑保持不变：图片双向绑定、编号预填与唯一性、必选标签校验、dirty 守卫、保存跳转。
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import AppTabs from '@/components/base/AppTabs.vue';
import AppTextarea from '@/components/base/AppTextarea.vue';
import ImageUploader from '@/components/business/ImageUploader.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import TagPicker from '@/components/business/TagPicker.vue';
import type { ImageUploaderState } from '@/components/business/types';
import type { SelectOption, TabItem } from '@/components/base/types';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { CLOTHING_STATUS_LABEL, type ClothingFormData, type ClothingStatus } from '@/models';
import { imageService, type ClothingDetail } from '@/services';
import { useClothingStore, useTagStore, useWardrobeStore } from '@/stores';

const route = useRoute();
const router = useRouter();
const clothingStore = useClothingStore();
const wardrobeStore = useWardrobeStore();
const tagStore = useTagStore();
const toast = useToast();
const { confirm } = useConfirm();

/** 表单字段与校验错误 */
interface EditFormState {
  /** 编号，可手改，需唯一 */
  code: string;
  /** 名字（必填） */
  name: string;
  /** 所属衣柜 id（必填） */
  wardrobeId: string;
  /** 状态：正常 / 待清洗 */
  status: ClothingStatus;
  /** 是否收藏 */
  favorite: boolean;
  /** 备注 */
  note: string;
  /** 全部已选标签 id */
  tagIds: string[];
}

/** 表单字段级错误信息 */
interface EditFormErrors {
  /** 编号错误 */
  code: string;
  /** 名字错误 */
  name: string;
  /** 衣柜错误 */
  wardrobeId: string;
  /** 品类标签错误 */
  category: string;
  /** 季节标签错误 */
  season: string;
  /** 颜色标签错误 */
  color: string;
  /** 图片错误 */
  images: string;
}

/** 状态切换项 */
const STATUS_TABS: TabItem[] = [
  { key: 'normal', label: CLOTHING_STATUS_LABEL.normal },
  { key: 'to_wash', label: CLOTHING_STATUS_LABEL.to_wash }
];

/** 编辑模式下的路由 id */
const editId = ref('');
/** 详情加载中 */
const loading = ref(true);
/** 加载完成后衣服是否不存在 */
const notFound = ref(false);
/** 提交中 */
const submitting = ref(false);
/** 表单是否被用户修改过（用于离开确认） */
const dirty = ref(false);
/** 「更多标签」是否展开 */
const moreOpen = ref(false);

/** 表单数据 */
const form = reactive<EditFormState>({
  code: '',
  name: '',
  wardrobeId: '',
  status: 'normal',
  favorite: false,
  note: '',
  tagIds: []
});

/** 错误信息 */
const errors = reactive<EditFormErrors>({
  code: '',
  name: '',
  wardrobeId: '',
  category: '',
  season: '',
  color: '',
  images: ''
});

/**
 * 生成一份空的图片上传状态（避免多个引用共享同一份数据）。
 * @returns 空的 ImageUploaderState
 */
function createEmptyUploaderState(): ImageUploaderState {
  return { existing: [], files: [], mainKey: undefined };
}

/** 图片上传状态（与 ImageUploader 双向绑定） */
const uploaderState = ref<ImageUploaderState>(createEmptyUploaderState());

/** 是否为编辑模式 */
const isEdit = computed(() => route.name === 'clothing-edit');
/** 页面标题 */
const pageTitle = computed(() => (isEdit.value ? '编辑衣服' : '新增衣服'));

/** 衣柜下拉选项（衣柜标识已改为几何令牌，不再拼进文案） */
const wardrobeOptions = computed<SelectOption[]>(() =>
  wardrobeStore.list.map((wardrobe) => ({
    value: wardrobe.id,
    label: wardrobe.name
  }))
);

/**
 * 判断表单里是否已选中指定类型的标签。
 * @param type 标签类型
 * @returns 是否已选中至少一个该类型标签
 */
function hasTagOfType(type: string): boolean {
  return form.tagIds.some((id) => tagStore.byId.get(id)?.type === type);
}

/**
 * 创建某个标签类型与 form.tagIds 之间的双向映射。
 * 注意：byId 中查不到的 id（例如刚新建、store 尚未刷新完成）会原样保留，避免误删。
 * @param type 标签类型
 * @returns 供 TagPicker 使用的 computed（get 过滤、set 合并）
 */
function tagIdsOfType(type: string) {
  const belongs = (id: string): boolean => {
    const tag = tagStore.byId.get(id);
    if (!tag) return false;
    return tag.type === type;
  };

  return computed<string[]>({
    get: () => form.tagIds.filter((id) => belongs(id)),
    set: (next: string[]) => {
      const kept = form.tagIds.filter((id) => !belongs(id));
      form.tagIds = [...kept, ...next];
    }
  });
}

/** 品类标签（必选） */
const categoryIds = tagIdsOfType('category');
/** 季节标签（必选） */
const seasonIds = tagIdsOfType('season');
/** 颜色标签（必选） */
const colorIds = tagIdsOfType('color');
/** 风格标签（可选） */
const styleIds = tagIdsOfType('style');
/** 场合标签（可选） */
const occasionIds = tagIdsOfType('occasion');
/** 材质标签（可选） */
const materialIds = tagIdsOfType('material');

/** 状态切换的 v-model */
const statusModel = computed<string>({
  get: () => form.status,
  set: (value: string) => {
    form.status = value === 'to_wash' ? 'to_wash' : 'normal';
  }
});

/**
 * 释放「已有图片」预览用到的对象 URL。
 */
function releaseExistingUrls(): void {
  for (const item of uploaderState.value.existing) {
    imageService.release(item.id);
  }
}

/**
 * 清空全部字段错误。
 */
function clearErrors(): void {
  errors.code = '';
  errors.name = '';
  errors.wardrobeId = '';
  errors.category = '';
  errors.season = '';
  errors.color = '';
  errors.images = '';
}

/**
 * 把已有衣服的图片解析为预览 URL，并初始化表单字段。
 * @param detail 衣服详情
 */
async function applyDetail(detail: ClothingDetail): Promise<void> {
  const sorted = [...detail.images].sort((left, right) => {
    if (left.isMain !== right.isMain) return left.isMain ? -1 : 1;
    return left.sortOrder - right.sortOrder;
  });

  const existing: { id: string; url: string }[] = [];
  await Promise.all(
    sorted.map(async (image) => {
      const url = await imageService.getUrl(image.id, 'full');
      if (url) existing.push({ id: image.id, url });
    })
  );

  uploaderState.value = {
    existing,
    files: [],
    mainKey: sorted.find((image) => image.isMain)?.id ?? existing[0]?.id
  };

  form.code = detail.clothing.code;
  form.name = detail.clothing.name;
  form.wardrobeId = detail.clothing.wardrobeId;
  form.status = detail.clothing.status;
  form.favorite = detail.clothing.favorite;
  form.note = detail.clothing.note ?? '';
  form.tagIds = detail.tags.map((tag) => tag.id);
}

/**
 * 初始化新增模式：自动生成编号并选中默认衣柜。
 */
async function applyNewDefaults(): Promise<void> {
  form.wardrobeId = wardrobeStore.defaultWardrobe?.id ?? '';
  const code = await clothingStore.nextCode();
  form.code = code;
}

/**
 * 提交表单：校验后调用 store 的新增 / 更新。
 */
async function handleSubmit(): Promise<void> {
  if (submitting.value) return;
  clearErrors();

  let firstError = '';

  if (!form.name.trim()) {
    errors.name = '请填写名字';
    firstError = firstError || errors.name;
  } else if (form.name.trim().length > 30) {
    errors.name = '名字不能超过 30 个字符';
    firstError = firstError || errors.name;
  }

  if (!form.wardrobeId) {
    errors.wardrobeId = '请选择所属衣柜';
    firstError = firstError || errors.wardrobeId;
  }

  if (!hasTagOfType('category')) {
    errors.category = '请至少选择一个品类标签';
    firstError = firstError || errors.category;
  }
  if (!hasTagOfType('season')) {
    errors.season = '请至少选择一个季节标签';
    firstError = firstError || errors.season;
  }
  if (!hasTagOfType('color')) {
    errors.color = '请至少选择一个颜色标签';
    firstError = firstError || errors.color;
  }

  if (!uploaderState.value.existing.length && !uploaderState.value.files.length) {
    errors.images = '请至少上传或保留一张图片';
    firstError = firstError || errors.images;
  }

  if (firstError) {
    toast.error(firstError);
    return;
  }

  const payload: ClothingFormData = {
    code: form.code.trim(),
    name: form.name.trim(),
    wardrobeId: form.wardrobeId,
    status: form.status,
    favorite: form.favorite,
    note: form.note.trim(),
    tagIds: [...form.tagIds],
    newImages: uploaderState.value.files,
    keepImageIds: uploaderState.value.existing.map((item) => item.id),
    mainImageKey: uploaderState.value.mainKey
  };

  submitting.value = true;
  try {
    if (isEdit.value) {
      await clothingStore.update(editId.value, payload);
      toast.success('保存成功');
      dirty.value = false;
      await router.replace({ name: 'clothing-detail', params: { id: editId.value } });
    } else {
      const created = await clothingStore.create(payload);
      toast.success('保存成功');
      dirty.value = false;
      await router.replace({ name: 'clothing-detail', params: { id: created.id } });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败';
    if (message.includes('编号')) errors.code = message;
    toast.error(message);
  } finally {
    submitting.value = false;
  }
}

/**
 * 取消编辑：有改动时先二次确认，再返回上一页。
 */
async function handleCancel(): Promise<void> {
  if (dirty.value) {
    const accepted = await confirm({
      title: '放弃修改？',
      message: '当前修改尚未保存，确定要离开吗？',
      danger: true
    });
    if (!accepted) return;
    dirty.value = false;
  }
  await router.back();
}

/**
 * 切换收藏状态。
 */
function toggleFavorite(): void {
  form.favorite = !form.favorite;
}

/** 任一表单字段或图片状态变化都视为「有改动」；初始化阶段的变更会在挂载流程末尾重置 */
const stopFormWatch = watch(
  form,
  () => {
    dirty.value = true;
  },
  { deep: true }
);

/** 图片上传状态变化同样视为「有改动」 */
const stopUploaderWatch = watch(
  uploaderState,
  () => {
    dirty.value = true;
  },
  { deep: true }
);

onMounted(async () => {
  try {
    if (!wardrobeStore.list.length) await wardrobeStore.load();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '衣柜列表加载失败');
  }
  try {
    if (!tagStore.list.length) await tagStore.load();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '标签加载失败');
  }

  try {
    if (isEdit.value) {
      const raw = route.params.id;
      editId.value = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
      const detail = editId.value ? await clothingStore.getDetail(editId.value) : undefined;
      if (!detail) {
        notFound.value = true;
        return;
      }
      await applyDetail(detail);
    } else {
      await applyNewDefaults();
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '数据加载失败');
    notFound.value = true;
  } finally {
    loading.value = false;
    // 初始化过程产生的变更不计入「用户改动」
    await nextTick();
    dirty.value = false;
  }
});

onUnmounted(() => {
  releaseExistingUrls();
  stopFormWatch();
  stopUploaderWatch();
});

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  const accepted = await confirm({
    title: '放弃修改？',
    message: '当前修改尚未保存，确定要离开吗？',
    danger: true
  });
  return accepted;
});
</script>

<template>
  <div class="page page--with-header page--narrow edit">
    <PageHeader :title="pageTitle" :back="true" />

    <div class="page__body edit__body">
      <div v-if="loading" class="edit__skeleton skeleton" />

      <AppEmpty
        v-else-if="notFound"
        motif="hanger"
        title="衣服不存在或已被删除"
        description="返回衣柜重新选择一件衣服吧"
      >
        <AppButton type="secondary" size="sm" @click="router.back()">返回</AppButton>
      </AppEmpty>

      <template v-else>
        <div class="edit__grid">
          <!-- 图片 -->
          <section class="m-card m-card--pad edit__section edit__section--media">
            <AppGeo class="edit__geo edit__geo--out-tl" shape="square" color="cyan" size="sm" :orbit="1" />
            <h2 class="m-section-title">图片</h2>
            <ImageUploader v-model="uploaderState" />
            <p v-if="errors.images" class="m-error">{{ errors.images }}</p>
          </section>

          <!-- 基本信息 -->
          <section class="m-card m-card--pad edit__section">
            <AppGeo class="edit__geo edit__geo--out-br" shape="circle" color="pink" size="sm" :orbit="2" />
            <h2 class="m-section-title">基本信息</h2>
            <AppInput
              v-model="form.code"
              label="编号"
              placeholder="如 NQ-0001"
              :error="errors.code"
              hint="可手动修改，需全局唯一"
            />
            <AppInput
              v-model="form.name"
              label="名字"
              placeholder="给这件衣服起个名字"
              :maxlength="30"
              :error="errors.name"
              required
            />
            <AppSelect
              v-model="form.wardrobeId"
              label="所属衣柜"
              :options="wardrobeOptions"
              placeholder="请选择衣柜"
              :error="errors.wardrobeId"
              required
            />
          </section>
        </div>

        <!-- 必选标签 -->
        <section class="m-card m-card--pad edit__section edit__section--tags">
          <AppGeo class="edit__geo edit__geo--out-tr" shape="diamond" color="yellow" size="md" :orbit="3" />
          <h2 class="m-section-title">必选标签</h2>
          <TagPicker v-model="categoryIds" type="category" title="品类" required collapsible :error="errors.category" />
          <TagPicker v-model="seasonIds" type="season" title="季节" required collapsible :error="errors.season" />
          <TagPicker v-model="colorIds" type="color" title="颜色" required collapsible :error="errors.color" />
        </section>

        <!-- 更多标签 -->
        <section class="m-card m-card--pad edit__section edit__section--tags">
          <button
            class="edit__more-toggle"
            type="button"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen"
          >
            <span class="m-section-title">更多标签</span>
            <AppIcon
              class="edit__more-caret"
              :class="{ 'edit__more-caret--open': moreOpen }"
              name="chevron-down"
              :size="18"
              :stroke-width="3"
            />
          </button>
          <div v-if="moreOpen" class="edit__more-body">
            <TagPicker v-model="styleIds" type="style" title="风格" collapsible />
            <TagPicker v-model="occasionIds" type="occasion" title="场合" collapsible />
            <TagPicker v-model="materialIds" type="material" title="材质" collapsible />
          </div>
        </section>

        <!-- 状态与收藏 -->
        <section class="m-card edit__section edit__section--flush">
          <AppGeo class="edit__geo edit__geo--out-br" shape="cross" color="green" size="sm" :orbit="4" />

          <div class="edit__section-body">
            <h2 class="m-section-title">状态</h2>
            <AppTabs v-model="statusModel" :tabs="STATUS_TABS" stretch tone="cyan" />
          </div>

          <span class="m-band m-zigzag edit__band" aria-hidden="true" />

          <button
            class="m-row-item edit__fav-row"
            type="button"
            :aria-pressed="form.favorite"
            @click="toggleFavorite"
          >
            <span class="m-row-item__body">
              <span class="m-row-item__label">收藏</span>
              <span class="m-row-item__desc">{{ form.favorite ? '已加入收藏' : '未收藏，点击可切换' }}</span>
            </span>
            <span class="edit__fav-mark" :class="{ 'edit__fav-mark--on': form.favorite }" aria-hidden="true">
              <AppIcon name="heart" :size="20" :filled="form.favorite" :stroke-width="2.6" />
            </span>
          </button>
        </section>

        <!-- 备注 -->
        <section class="m-card m-card--pad edit__section">
          <AppGeo class="edit__geo edit__geo--out-bl" shape="triangle" color="red" size="sm" :orbit="5" />
          <AppTextarea
            v-model="form.note"
            label="备注"
            placeholder="记录搭配灵感、购买信息等"
            :rows="4"
            :maxlength="200"
          />
        </section>

        <!-- 操作条：<1024px 固定在底部导航之上，≥1024px 变成表单末尾的普通按钮行 -->
        <div class="edit__actions">
          <AppButton type="secondary" :disabled="submitting" @click="handleCancel">取消</AppButton>
          <AppButton block icon="check" :loading="submitting" @click="handleSubmit">保存</AppButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.edit__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
  /* 预留移动端固定操作条的高度 */
  padding-bottom: calc(var(--m-8) + 84px);
}

@media (min-width: 640px) {
  .edit__body {
    gap: var(--m-6);
  }
}

@media (min-width: 1024px) {
  /* 桌面端操作条回到表单末尾，不再需要额外留白 */
  .edit__body {
    padding-bottom: var(--m-9);
  }
}

.edit__skeleton {
  height: 320px;
  border: var(--m-line);
}

/* ---------------- 区块栅格 ---------------- */

.edit__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--m-5);
  align-items: start;
}

@media (min-width: 700px) {
  .edit__grid {
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    gap: var(--m-6);
  }
}

.edit__section {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

/* 标签选择器自身带上下内边距，区块内间距收紧一档 */
.edit__section--tags {
  gap: var(--m-2);
}

/* 状态区块：内部行要通栏，所以卡片本身不加内边距 */
.edit__section--flush {
  gap: 0;
}

.edit__section-body {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
  padding: var(--m-4);
}

/* 状态与收藏之间的折线装饰带（图案用 currentColor 着色） */
.edit__band {
  display: block;
  color: var(--m-text-muted);
}

@media (min-width: 700px) {
  .edit__section-body {
    padding: var(--m-5);
  }
}

@media (min-width: 1024px) {
  .edit__section-body {
    padding: var(--m-6);
  }
}

/* 窄列里的上传器改成两列，避免缩略图过小 */
@media (min-width: 700px) {
  .edit__section--media :deep(.uploader__grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---------------- 几何装饰 ---------------- */

.edit__geo {
  z-index: 3;
}

.edit__geo--out-tl {
  position: absolute;
  top: -12px;
  left: -12px;
}

.edit__geo--out-tr {
  position: absolute;
  top: -12px;
  right: -12px;
}

.edit__geo--out-bl {
  position: absolute;
  bottom: -12px;
  left: -12px;
}

.edit__geo--out-br {
  position: absolute;
  bottom: -12px;
  right: -12px;
}

/* ---------------- 更多标签折叠 ---------------- */

.edit__more-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--m-3);
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--m-text);
  text-align: left;
}

.edit__more-caret {
  color: var(--m-text-muted);
  transform: rotate(-90deg);
  transition: transform var(--m-dur) var(--m-ease);
}

.edit__more-caret--open {
  transform: rotate(0deg);
}

.edit__more-body {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
}

/* ---------------- 收藏行 ---------------- */

.edit__fav-row {
  min-height: 68px;
}

.edit__fav-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border: var(--m-line);
  background-color: var(--m-surface);
  color: var(--m-text);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

/* 已收藏：粉底 + 填充心形，颜色与形状同时变化 */
.edit__fav-mark--on {
  background-color: var(--m-pink);
  color: var(--m-on-accent);
}

@media (hover: hover) and (pointer: fine) {
  .edit__fav-row:hover .edit__fav-mark {
    box-shadow: var(--m-shadow-sm);
  }
}

/* ---------------- 底部操作条 ---------------- */

.edit__actions {
  position: fixed;
  left: var(--m-rail);
  right: 0;
  bottom: calc(var(--m-nav-h) + var(--m-safe-b));
  z-index: 30;
  display: flex;
  gap: var(--m-3);
  padding: var(--m-3) var(--m-4);
  background-color: var(--m-surface);
  border-top: var(--m-line);
  box-shadow: 0 -4px 0 0 var(--m-line-color);
}

@media (min-width: 1024px) {
  .edit__actions {
    position: static;
    bottom: auto;
    padding: 0;
    background-color: transparent;
    border-top: none;
    box-shadow: none;
  }
}
</style>
