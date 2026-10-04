/**
 * SettingsView：设置页（孟菲斯风格）。
 * 应用偏好（应用名 / 主题 / 默认排序）、管理入口、数据导入导出与清空、AI 配置预留、关于。
 * 全部视觉走 --m-* 令牌与全局孟菲斯类，页面内不出现任何 emoji。
 */
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/base/AppButton.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppInput from '@/components/base/AppInput.vue';
import AppSelect from '@/components/base/AppSelect.vue';
import type { SelectOption } from '@/components/base/types';
import PageHeader from '@/components/business/PageHeader.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { aiService, backupService } from '@/services';
import { useClothingStore, useSettingsStore, useTagStore, useWardrobeStore } from '@/stores';
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_APP_NAME,
  SORT_KEY_LABEL,
  type AiConfig,
  type AiProvider,
  type AppTheme,
  type SortKey
} from '@/models';

/** 应用版本号（关于分组展示，发版时手动更新） */
const APP_VERSION = '0.1.0';

/** 应用名最大长度 */
const APP_NAME_MAX = 12;

/** 主题选项 */
const THEME_OPTIONS: SelectOption[] = [
  /** 浅色主题 */
  { value: 'light', label: '浅色' },
  /** 深色主题 */
  { value: 'dark', label: '深色' },
  /** 跟随系统 */
  { value: 'auto', label: '跟随系统' }
];

/** 导入条数的中文名映射 */
const COUNT_LABEL: Record<string, string> = {
  /** 衣柜 */
  wardrobes: '衣柜',
  /** 衣服 */
  clothes: '衣服',
  /** 图片 */
  images: '图片',
  /** 标签 */
  tags: '标签',
  /** 搭配 */
  outfits: '搭配',
  /** 日记 */
  diaries: '日记',
  /** 穿着记录 */
  wearRecords: '穿着记录'
};

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
 * 把导入条数拼成「衣柜 1 · 衣服 12」形式的中文摘要。
 * @param counts 各表导入条数
 * @returns 摘要文案，无数据时返回「无数据」
 */
function formatCounts(counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const key of Object.keys(counts)) {
    const label = COUNT_LABEL[key] ?? key;
    parts.push(`${label} ${counts[key]}`);
  }
  return parts.length ? parts.join(' · ') : '无数据';
}

const router = useRouter();
const toast = useToast();
const confirmDialog = useConfirm();
const settingsStore = useSettingsStore();
const wardrobeStore = useWardrobeStore();
const tagStore = useTagStore();
const clothingStore = useClothingStore();

/** 应用名草稿（保存后写回 store） */
const appNameDraft = ref<string>(DEFAULT_APP_NAME);
/** 应用名保存中 */
const savingName = ref(false);
/** 数据类操作（导入 / 导出 / 清空）进行中 */
const dataBusy = ref(false);
/** AI 配置表单（保存前只改本地副本） */
const aiForm = ref<AiConfig>({ ...settingsStore.aiConfig });
/** 测试连接进行中 */
const testing = ref(false);
/** AI 配置保存中 */
const savingAi = ref(false);
/** 隐藏的文件选择框引用 */
const fileInputRef = ref<HTMLInputElement | null>(null);

/** 默认排序选项 */
const sortOptions = computed<SelectOption[]>(() =>
  (Object.keys(SORT_KEY_LABEL) as SortKey[]).map((key) => ({ value: key, label: SORT_KEY_LABEL[key] }))
);

/** AI 服务商选项 */
const providerOptions = computed<SelectOption[]>(() =>
  AI_PROVIDER_PRESETS.map((preset) => ({ value: preset.provider, label: preset.label }))
);

/** 衣柜数量 */
const wardrobeCount = computed<number>(() => wardrobeStore.list.length);

/** 标签总数 */
const tagCount = computed<number>(() => tagStore.list.length);

/** 关于分组展示的应用名（空值回退默认名） */
const displayAppName = computed<string>(() => settingsStore.appName || DEFAULT_APP_NAME);

// 设置从数据库加载完成后同步应用名草稿
watch(
  () => settingsStore.appName,
  (value) => {
    appNameDraft.value = value || DEFAULT_APP_NAME;
  },
  { immediate: true }
);

// AI 配置从数据库加载完成后同步表单副本
watch(
  () => settingsStore.aiConfig,
  (value) => {
    aiForm.value = { ...value };
  },
  { deep: true, immediate: true }
);

/**
 * 确保页面依赖的数据已加载。
 */
async function ensureLoaded(): Promise<void> {
  try {
    const jobs: Promise<void>[] = [wardrobeStore.load(), tagStore.load()];
    if (!settingsStore.ready) jobs.push(settingsStore.init());
    await Promise.all(jobs);
  } catch (error) {
    toast.error(toMessage(error, '设置数据加载失败'));
  }
}

/**
 * 重新加载全部 store（导入 / 清空后调用）。
 */
async function refreshStores(): Promise<void> {
  await Promise.all([
    settingsStore.init(),
    wardrobeStore.load(),
    tagStore.load(),
    clothingStore.load()
  ]);
}

/**
 * 保存应用名。
 */
async function handleSaveAppName(): Promise<void> {
  savingName.value = true;
  try {
    await settingsStore.setAppName(appNameDraft.value.trim());
    appNameDraft.value = settingsStore.appName;
    toast.success('应用名已保存');
  } catch (error) {
    toast.error(toMessage(error, '应用名保存失败'));
  } finally {
    savingName.value = false;
  }
}

/**
 * 切换主题并立即生效。
 * @param value 选中的主题值
 */
async function handleThemeChange(value: string): Promise<void> {
  try {
    await settingsStore.setTheme(value as AppTheme);
    toast.success('主题已切换');
  } catch (error) {
    toast.error(toMessage(error, '主题切换失败'));
  }
}

/**
 * 修改默认排序方式。
 * @param value 选中的排序键
 */
async function handleSortChange(value: string): Promise<void> {
  try {
    await settingsStore.setDefaultSort(value as SortKey);
    toast.success('默认排序已更新');
  } catch (error) {
    toast.error(toMessage(error, '默认排序更新失败'));
  }
}

/**
 * 跳转到衣柜管理页。
 */
function goWardrobes(): void {
  router.push({ name: 'wardrobes' }).catch(() => toast.error('页面跳转失败'));
}

/**
 * 跳转到标签管理页。
 */
function goTags(): void {
  router.push({ name: 'tags' }).catch(() => toast.error('页面跳转失败'));
}

/**
 * 导出备份并触发浏览器下载。
 */
async function handleExport(): Promise<void> {
  dataBusy.value = true;
  try {
    await backupService.downloadBackup(settingsStore.appName);
    toast.success('备份已导出');
  } catch (error) {
    toast.error(toMessage(error, '备份导出失败'));
  } finally {
    dataBusy.value = false;
  }
}

/**
 * 打开系统文件选择框（导入备份）。
 */
function handleImportClick(): void {
  fileInputRef.value?.click();
}

/**
 * 处理用户选中的备份文件：二次确认后覆盖导入。
 * @param event 文件输入框的 change 事件
 */
async function handleImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const confirmed = await confirmDialog.confirm({
      title: '导入备份',
      message: '导入会清空并覆盖当前全部数据，确定继续吗？',
      confirmText: '导入',
      danger: true
    });
    if (!confirmed) return;

    dataBusy.value = true;
    const result = await backupService.importFromFile(file);
    await refreshStores();
    toast.success(`导入成功：${formatCounts(result.counts)}`);
  } catch (error) {
    toast.error(toMessage(error, '备份导入失败'));
  } finally {
    dataBusy.value = false;
    // 清空 value，允许重复选择同一个文件
    input.value = '';
  }
}

/**
 * 清空全部数据；由于预置标签与默认衣柜由启动时的 seed 写入，
 * 这里在提示后重新载入应用，让 seed 重新生成基础数据。
 */
async function handleClearAll(): Promise<void> {
  try {
    const confirmed = await confirmDialog.confirm({
      title: '清空数据',
      message: '将删除全部衣柜、衣服、图片、标签与设置，且不可恢复。确定继续吗？',
      confirmText: '清空',
      danger: true
    });
    if (!confirmed) return;

    dataBusy.value = true;
    await backupService.clearAll();
    toast.success('数据已清空，应用即将重新载入…');
    window.setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    toast.error(toMessage(error, '清空数据失败'));
    dataBusy.value = false;
  }
}

/**
 * 切换 AI 开关并立即持久化。
 */
async function handleToggleAi(): Promise<void> {
  const next = !aiForm.value.enabled;
  aiForm.value.enabled = next;
  try {
    await settingsStore.saveAiConfig({ ...aiForm.value });
    toast.success(next ? '已开启 AI 配置' : '已关闭 AI');
  } catch (error) {
    aiForm.value.enabled = !next;
    toast.error(toMessage(error, 'AI 开关保存失败'));
  }
}

/**
 * 切换服务商时自动填充 Base URL 与模型名。
 * @param value 选中的服务商标识
 */
function handleProviderChange(value: string): void {
  const provider = value as AiProvider;
  aiForm.value.provider = provider;
  const preset = AI_PROVIDER_PRESETS.find((item) => item.provider === provider);
  if (!preset) return;
  aiForm.value.baseUrl = preset.baseUrl;
  aiForm.value.model = preset.model;
  toast.info(`已填入「${preset.label}」的默认配置，可手动调整`);
}

/**
 * 测试 AI 连接（成功与失败都用 Toast 展示服务返回的说明）。
 */
async function handleTestConnection(): Promise<void> {
  testing.value = true;
  try {
    const result = await aiService.testConnection({ ...aiForm.value });
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  } catch (error) {
    toast.error(toMessage(error, '测试连接失败'));
  } finally {
    testing.value = false;
  }
}

/**
 * 保存 AI 配置。
 */
async function handleSaveAi(): Promise<void> {
  savingAi.value = true;
  try {
    await settingsStore.saveAiConfig({ ...aiForm.value });
    toast.success('AI 配置已保存');
  } catch (error) {
    toast.error(toMessage(error, 'AI 配置保存失败'));
  } finally {
    savingAi.value = false;
  }
}

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <div class="page page--with-header">
    <PageHeader title="设置" :back="true" subtitle="偏好、管理与本机数据" />

    <div class="page__body">
      <!-- 手机端单列纵向；桌面端（≥1024px）两列：左列 应用 / 管理，右列 数据 / AI，关于跨两列 -->
      <div class="settings">
        <div class="settings__col">
          <!-- 应用 -->
          <section class="m-card m-card--pad settings__card settings__card--app">
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="circle" color="yellow" size="md" :orbit="1" at="tr" />
            </div>

            <h2 class="m-section-title settings__title">应用</h2>

            <div class="m-row-item settings__row settings__row--static settings__row--stack">
              <AppInput
                v-model="appNameDraft"
                label="应用名"
                :placeholder="DEFAULT_APP_NAME"
                :maxlength="APP_NAME_MAX"
                hint="修改后会同步到浏览器标题栏"
              />
              <div class="settings__actions">
                <AppButton size="sm" icon="check" :loading="savingName" @click="handleSaveAppName">
                  保存
                </AppButton>
              </div>
            </div>

            <div class="m-row-item settings__row settings__row--static">
              <span class="m-row-item__label">主题</span>
              <div class="settings__control">
                <AppSelect
                  :model-value="settingsStore.theme"
                  :options="THEME_OPTIONS"
                  @update:model-value="handleThemeChange"
                />
              </div>
            </div>

            <div class="m-row-item settings__row settings__row--static">
              <span class="m-row-item__label">默认排序</span>
              <div class="settings__control">
                <AppSelect
                  :model-value="settingsStore.defaultSort"
                  :options="sortOptions"
                  @update:model-value="handleSortChange"
                />
              </div>
            </div>
          </section>

          <!-- 管理入口 -->
          <section class="m-card m-card--pad settings__card settings__card--manage">
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="cross" color="cyan" size="md" :orbit="2" at="tr" />
            </div>

            <h2 class="m-section-title settings__title">管理</h2>

            <button class="m-row-item settings__row" type="button" @click="goWardrobes">
              <span class="m-row-item__body">
                <span class="m-row-item__label">衣柜管理</span>
              </span>
              <span class="m-row-item__value m-mono">{{ wardrobeCount }} 个衣柜</span>
              <AppIcon class="settings__chev" name="chevron-right" :size="18" :stroke-width="3" />
            </button>

            <button class="m-row-item settings__row" type="button" @click="goTags">
              <span class="m-row-item__body">
                <span class="m-row-item__label">标签管理</span>
              </span>
              <span class="m-row-item__value m-mono">{{ tagCount }} 个标签</span>
              <AppIcon class="settings__chev" name="chevron-right" :size="18" :stroke-width="3" />
            </button>
          </section>
        </div>

        <div class="settings__col">
          <!-- 数据 -->
          <section class="m-card m-card--pad settings__card settings__card--data">
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="triangle" color="red" size="md" :orbit="3" at="tr" />
            </div>

            <h2 class="m-section-title settings__title">数据</h2>

            <div class="m-row-item settings__row settings__row--static settings__row--stack">
              <div class="m-row-item__body">
                <span class="m-row-item__label">导出备份</span>
                <span class="m-caption">把衣柜、衣服、图片与设置导出成 JSON 文件</span>
              </div>
              <div class="settings__actions">
                <AppButton
                  type="secondary"
                  tone="cyan"
                  size="sm"
                  icon="download"
                  :disabled="dataBusy"
                  @click="handleExport"
                >
                  导出
                </AppButton>
              </div>
            </div>

            <div class="m-row-item settings__row settings__row--static settings__row--stack">
              <div class="m-row-item__body">
                <span class="m-row-item__label">导入备份</span>
                <span class="m-caption">会清空并覆盖当前全部数据，选择文件后还需二次确认</span>
              </div>
              <div class="settings__actions">
                <AppButton
                  type="secondary"
                  tone="yellow"
                  size="sm"
                  icon="upload"
                  :disabled="dataBusy"
                  @click="handleImportClick"
                >
                  导入
                </AppButton>
              </div>
            </div>

            <div class="m-row-item settings__row settings__row--static settings__row--stack">
              <div class="m-row-item__body">
                <span class="m-row-item__label">清空数据</span>
                <span class="m-caption">删除全部衣柜、衣服、图片、标签与设置，且不可恢复</span>
              </div>
              <div class="settings__actions">
                <AppButton
                  type="danger"
                  size="sm"
                  icon="trash"
                  :disabled="dataBusy"
                  @click="handleClearAll"
                >
                  清空
                </AppButton>
              </div>
            </div>

            <p class="m-caption settings__note">导出的文件包含衣柜、衣服、图片与设置，可随时导入还原。</p>

            <input
              ref="fileInputRef"
              class="settings__file"
              type="file"
              accept="application/json,.json"
              @change="handleImportFile"
            />
          </section>

          <!-- AI 配置（预留） -->
          <section class="m-card m-card--pad settings__card settings__card--ai">
            <div class="m-geo-layer" aria-hidden="true">
              <AppGeo shape="diamond" color="pink" size="md" :orbit="1" at="tr" />
            </div>

            <h2 class="m-section-title settings__title">AI（预留）</h2>
            <p class="m-caption settings__note">AI 能力尚未实现（第三阶段），这里只保存配置。</p>

            <button
              class="m-row-item settings__row"
              type="button"
              :aria-pressed="aiForm.enabled"
              @click="handleToggleAi"
            >
              <span class="m-row-item__body">
                <span class="m-row-item__label">启用 AI</span>
                <span class="m-caption">
                  {{ aiForm.enabled ? '已开启，可填写下面的服务商与密钥' : '当前关闭，配置仍会照常保存' }}
                </span>
              </span>
              <span class="switch" :class="{ 'switch--on': aiForm.enabled }" aria-hidden="true">
                <span class="switch__dot" />
              </span>
            </button>

            <div class="settings__fields">
              <AppSelect
                label="服务商"
                :model-value="aiForm.provider"
                :options="providerOptions"
                @update:model-value="handleProviderChange"
              />

              <AppInput
                v-model="aiForm.baseUrl"
                label="Base URL"
                placeholder="https://api.deepseek.com/v1"
              />

              <AppInput
                v-model="aiForm.apiKey"
                label="API Key"
                type="password"
                placeholder="仅保存在本机"
                hint="Key 只写入本地数据库，不会上传"
              />

              <AppInput v-model="aiForm.model" label="模型名" placeholder="deepseek-chat" />
            </div>

            <div class="settings__actions settings__actions--split">
              <AppButton type="secondary" tone="pink" :loading="testing" @click="handleTestConnection">
                测试连接
              </AppButton>
              <AppButton :loading="savingAi" @click="handleSaveAi">保存 AI 配置</AppButton>
            </div>
          </section>
        </div>

        <!-- 关于：桌面端跨两列 -->
        <section class="m-card m-card--pad settings__card settings__card--about">
          <div class="m-geo-layer" aria-hidden="true">
            <AppGeo shape="square" color="green" size="md" :orbit="3" at="tr" />
          </div>

          <h2 class="m-section-title settings__title">关于</h2>

          <div class="m-fact">
            <span class="m-fact__label">应用名</span>
            <span class="m-fact__value">{{ displayAppName }}</span>
          </div>

          <div class="m-fact">
            <span class="m-fact__label">版本</span>
            <span class="m-fact__value m-mono">v{{ APP_VERSION }}</span>
          </div>

          <p class="m-caption settings__note">纯本地离线应用，数据全部保存在当前设备的浏览器数据库中。</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------- 分组骨架 ------------------------- */

.settings {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
}

.settings__col {
  display: flex;
  flex-direction: column;
  gap: var(--m-5);
  min-width: 0;
}

.settings__card {
  /* 每个分组一个撞色方块 */
  --m-title-accent: var(--m-yellow);
  overflow: hidden;
}

.settings__card--manage {
  --m-title-accent: var(--m-cyan);
}

.settings__card--data {
  --m-title-accent: var(--m-red);
}

.settings__card--ai {
  --m-title-accent: var(--m-pink);
}

.settings__card--about {
  --m-title-accent: var(--m-green);
}

.settings__title {
  margin-bottom: var(--m-4);
}

/* ------------------------- 行 ------------------------- */

/* 行内容左右与卡片内边距对齐，分隔线由 .m-row-item 的粗描边提供 */
.settings__row {
  padding-left: 0;
  padding-right: 0;
}

.settings__row > .m-row-item__label {
  flex: 1 1 auto;
  min-width: 0;
}

/* 说明文字 + 操作按钮：手机与桌面都保持纵向，避免表单控件被压窄 */
.settings__row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: var(--m-3);
}

/* 主题 / 默认排序这类「非点击行」不做 hover 换色，避免被误认为可点 */
.m-row-item.settings__row--static:hover {
  background-color: var(--m-surface);
}

.m-row-item.settings__row--static:hover .m-row-item__label {
  color: var(--m-text);
}

/* 可点击行 hover 变黄时，说明文字同步换成撞色底上的墨色（禁止彩色底上放灰字） */
@media (hover: hover) and (pointer: fine) {
  .m-row-item:not(.settings__row--static):hover .m-caption {
    color: var(--m-on-accent);
  }
}

.settings__control {
  flex: 0 0 clamp(136px, 46%, 190px);
  min-width: 0;
}

.settings__chev {
  flex: 0 0 auto;
  color: var(--m-text);
}

/* ------------------------- 操作区 ------------------------- */

.settings__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--m-3);
}

/* 设置项里的操作按钮统一保证 44px 触摸目标 */
.settings__actions > * {
  min-height: 44px;
}

.settings__actions--split {
  margin-top: var(--m-5);
}

.settings__actions--split > * {
  flex: 1;
}

.settings__fields {
  display: flex;
  flex-direction: column;
  gap: var(--m-4);
  padding-top: var(--m-4);
}

.settings__note {
  margin-top: var(--m-4);
}

/* 隐藏的原生文件选择框（由「导入」按钮触发） */
.settings__file {
  display: none;
}

/* ------------------------- 开关：直角玩具拨片 ------------------------- */

.switch {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex: 0 0 auto;
  width: 58px;
  height: 34px;
  padding: 4px;
  border: var(--m-line);
  background-color: var(--m-surface-2);
  box-shadow: var(--m-shadow-xs);
  transition: var(--m-transition);
}

.switch--on {
  justify-content: flex-end;
  background-color: var(--m-green);
  box-shadow: var(--m-shadow-sm);
}

.switch__dot {
  width: 18px;
  height: 18px;
  background-color: var(--m-ink);
}

/* ------------------------- 断点 ------------------------- */

/* 手机端大留白：卡片内行距略松 */
@media (min-width: 640px) {
  .settings,
  .settings__col {
    gap: var(--m-6);
  }
}

/* 桌面端：两列栅格，关于跨两列 */
@media (min-width: 1024px) {
  .settings {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--m-7);
    align-items: start;
  }

  .settings__col {
    gap: var(--m-7);
  }

  .settings__card--about {
    grid-column: 1 / -1;
  }

  .settings__actions--split > * {
    flex: 0 0 auto;
  }
}

/* 超宽屏：留白再加大 */
@media (min-width: 1440px) {
  .settings {
    gap: var(--m-8);
  }

  .settings__col {
    gap: var(--m-8);
  }
}
</style>
