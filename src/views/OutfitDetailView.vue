<!-- 搭配详情/编辑（孟菲斯风格过渡页）：
     读取指定搭配、载入搭配页画布，然后跳回搭配页；真正的详情展示留到第二阶段（见文内 TODO）。 -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppEmpty from '@/components/base/AppEmpty.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import PageHeader from '@/components/business/PageHeader.vue';
import { useToast } from '@/composables/useToast';
import { outfitService } from '@/services';
import { useOutfitStore } from '@/stores';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const outfitStore = useOutfitStore();

/** 是否正在载入搭配 */
const loading = ref(true);
/** 载入失败的提示文案（为空表示没出错） */
const errorText = ref('');

/**
 * 把捕获到的未知错误转成可展示文案。
 * @param error 捕获到的错误
 * @returns 错误文案
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '载入搭配失败，请稍后重试';
}

/**
 * 读取路由参数里的搭配 id。
 * @returns 搭配 id；参数缺失或类型不对时返回空串
 */
function resolveOutfitId(): string {
  const { id } = route.params;
  return typeof id === 'string' ? id : '';
}

/**
 * 载入搭配到画布，随后回到搭配页继续编辑。
 */
async function loadDetail(): Promise<void> {
  const id = resolveOutfitId();
  if (!id) {
    errorText.value = '缺少搭配 id，无法打开这个搭配';
    loading.value = false;
    return;
  }

  loading.value = true;
  errorText.value = '';
  try {
    const detail = await outfitService.getDetail(id);
    if (!detail) {
      errorText.value = '这个搭配不存在，可能已经被删除了';
      return;
    }
    outfitStore.loadToCanvas(detail.outfit, detail.items);
    toast.success(`已载入「${detail.outfit.name}」`);
    await router.replace({ name: 'outfit' });
  } catch (error) {
    errorText.value = toErrorMessage(error);
    toast.error(errorText.value);
  } finally {
    loading.value = false;
  }
}

/** 返回上一页 */
function goBack(): void {
  router.back();
}

// TODO(第二阶段)：本页做成真正的搭配详情——只读展示全部槽位与衣服、一键收藏（toggleFavorite）、
// TODO(第二阶段)：删除搭配（useConfirm 二次确认 + outfitStore.remove）、改名与换封面图。
// TODO(第二阶段)：支持「按这套写日记」入口（带上 outfitId 跳 DiaryEditView）。

onMounted(() => {
  void loadDetail();
});
</script>

<template>
  <div class="page page--with-header page--narrow outfit-detail">
    <PageHeader title="搭配详情" back tone="cyan" />

    <div class="page__body outfit-detail__body">
      <!-- 载入中：骨架条纹块 + 说明文案（几何装饰在 .m-card 内，hover 会漂移） -->
      <div v-if="loading" class="outfit-detail__loading m-card m-card--pad">
        <div class="m-geo-layer" aria-hidden="true">
          <AppGeo shape="diamond" color="yellow" size="md" :orbit="1" at="tr" />
          <AppGeo shape="circle" color="cyan" size="sm" :orbit="3" at="bl" />
        </div>

        <span class="skeleton outfit-detail__bar outfit-detail__bar--wide" />
        <span class="skeleton outfit-detail__bar" />
        <span class="skeleton outfit-detail__bar outfit-detail__bar--short" />

        <p class="m-caption outfit-detail__hint">正在载入搭配…</p>
      </div>

      <AppEmpty
        v-else-if="errorText"
        motif="layers"
        title="没能打开这个搭配"
        :description="errorText"
      >
        <AppButton type="secondary" tone="red" size="md" icon="chevron-left" @click="goBack">
          返回搭配
        </AppButton>
      </AppEmpty>

      <AppEmpty v-else motif="layers" title="已载入搭配" description="正在回到搭配页继续编辑…" />
    </div>
  </div>
</template>

<style scoped>
.outfit-detail__body {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.outfit-detail__loading {
  display: flex;
  flex-direction: column;
  gap: var(--m-3);
}

.outfit-detail__bar {
  position: relative;
  z-index: 1;
  display: block;
  height: 18px;
}

.outfit-detail__bar--wide {
  width: 78%;
}

.outfit-detail__bar--short {
  width: 52%;
}

.outfit-detail__hint {
  position: relative;
  z-index: 1;
  margin-top: var(--m-2);
}
</style>
