/**
 * App：根组件。
 * 负责路由出口、响应式导航（手机底部 tab / 桌面左侧导航栅）、
 * 全局 Toast 与二次确认挂载，以及桌面端的背景几何装饰。
 */
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import AppConfirm from '@/components/base/AppConfirm.vue';
import AppGeo from '@/components/base/AppGeo.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import AppToast from '@/components/base/AppToast.vue';
import { useAndroidBackButton } from '@/composables/useAndroidBackButton';
import { useToast } from '@/composables/useToast';
import type { GeoColor, IconName } from '@/components/base/types';
import { APP_VERSION } from '@/models';
import { useSettingsStore, useTagStore } from '@/stores';

/** 底部 / 侧边导航项 */
interface NavItem {
  /** 路由名 */
  name: string;
  /** 展示文案 */
  label: string;
  /** 图标 */
  icon: IconName;
  /** 选中时的撞色 */
  tone: GeoColor;
}

/** 底部导航 5 个 tab */
const NAV_ITEMS: NavItem[] = [
  { name: 'wardrobe', label: '我的衣柜', icon: 'hanger', tone: 'red' },
  { name: 'favorites', label: '收藏', icon: 'heart', tone: 'pink' },
  { name: 'outfit', label: '搭配', icon: 'layers', tone: 'cyan' },
  { name: 'diary', label: '日记', icon: 'calendar', tone: 'green' },
  { name: 'settings', label: '设置', icon: 'sliders', tone: 'yellow' }
];

const route = useRoute();
const settingsStore = useSettingsStore();
const toast = useToast();

/** 当前路由对应的 tab，缺省表示当前是二级页面 */
const activeTab = computed(() => route.meta.tab ?? '');

/** 是否处于底部导航对应的主 tab 页（手机端据此决定是否显示底部导航） */
const hasTab = computed(() => Boolean(activeTab.value));

/** 系统主题监听的取消函数 */
let stopThemeWatch: (() => void) | null = null;

const tagStore = useTagStore();

// 安卓实体返回键：应用内逐级返回，退到最外层才退出应用
useAndroidBackButton();

onMounted(async () => {
  try {
    await settingsStore.init();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '设置读取失败');
  }
  stopThemeWatch = settingsStore.watchSystemTheme();

  // 标签是全局小数据集（约 49 条），主界面的标签筛选面板、以及
  // 「选中一级标签自动索引二级标签」都要用，这里统一预加载一次。
  try {
    await tagStore.load();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '标签加载失败');
  }
});

onUnmounted(() => {
  stopThemeWatch?.();
  stopThemeWatch = null;
});
</script>

<template>
  <div class="app">
    <!-- 桌面端背景几何装饰：只在宽屏出现，避免小屏拥挤 -->
    <div class="app-deco" aria-hidden="true">
      <AppGeo class="app-deco__a" shape="circle" color="yellow" size="xl" />
      <AppGeo class="app-deco__b" shape="diamond" color="cyan" size="lg" />
      <AppGeo class="app-deco__c" shape="triangle" color="pink" size="xl" />
      <AppGeo class="app-deco__d" shape="ring" color="green" size="lg" />
      <span class="app-deco__wave m-wave" />
    </div>

    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>

    <!--
      导航：手机端只在主 tab 页显示底部导航；桌面端常驻左侧导航栅
      （二级页面同样显示，只是没有任何一项处于选中态）。
    -->
    <nav class="app-nav" :class="{ 'app-nav--tab': hasTab }" aria-label="主导航">
      <div class="app-nav__brand">
        <span class="app-nav__mark" aria-hidden="true" />
        <span class="app-nav__name ellipsis">{{ settingsStore.appName }}</span>
      </div>

      <ul class="app-nav__list">
        <li v-for="item in NAV_ITEMS" :key="item.name" class="app-nav__entry">
          <RouterLink
            class="app-nav__item"
            :class="[`app-nav__item--${item.tone}`, { 'app-nav__item--active': activeTab === item.name }]"
            :to="{ name: item.name }"
            :aria-current="activeTab === item.name ? 'page' : undefined"
          >
            <span class="app-nav__icon">
              <AppIcon :name="item.icon" :size="22" :filled="item.icon === 'heart' && activeTab === item.name" />
            </span>
            <span class="app-nav__label">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>

      <div class="app-nav__foot">
        <span class="app-nav__foot-band m-zigzag" aria-hidden="true" />
        <span class="app-nav__version m-mono">v{{ APP_VERSION }}</span>
      </div>
    </nav>

    <AppToast />
    <AppConfirm />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
}

/* ------------------------- 背景几何装饰（仅桌面） ------------------------- */

.app-deco {
  display: none;
}

@media (min-width: 1024px) {
  .app-deco {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 0;
    /* 背景装饰压到内容之下，避免和正文抢注意力 */
    opacity: 0.42;
    pointer-events: none;
  }

  .app-deco__a {
    position: absolute;
    top: 96px;
    right: 56px;
    opacity: 0.9;
  }

  .app-deco__b {
    position: absolute;
    top: 300px;
    right: 168px;
  }

  .app-deco__c {
    position: absolute;
    bottom: 140px;
    left: calc(var(--m-rail) + 48px);
  }

  .app-deco__d {
    position: absolute;
    top: 46%;
    left: calc(var(--m-rail) - 26px);
  }

  .app-deco__wave {
    position: absolute;
    left: var(--m-rail);
    bottom: 56px;
    width: calc(100% - var(--m-rail) - 64px);
    height: 14px;
    color: var(--m-text-muted);
    opacity: 0.5;
  }
}

/* ------------------------------ 导航 ------------------------------ */

/**
 * 默认隐藏：手机端的二级页面（详情、编辑、管理页）自带返回头与底部操作条，
 * 不再叠加底部导航。桌面端在下面的媒体查询里强制常驻。
 */
.app-nav {
  display: none;
  background-color: var(--m-surface);
}

/* --- 手机：底部 tab（仅主 tab 页） --- */

.app-nav--tab {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 300;
  display: flex;
  align-items: stretch;
  height: calc(var(--m-nav-h) + var(--m-safe-b));
  padding-bottom: var(--m-safe-b);
  /* 外框分隔线：深色模式下用暖灰，避免底部出现一条白线 */
  border-top: var(--m-bw) solid var(--m-chrome-line);
  box-shadow: 0 -5px 0 0 var(--m-chrome-line);
}

.app-nav__brand,
.app-nav__foot {
  display: none;
}

.app-nav__list {
  display: flex;
  flex: 1;
  align-items: stretch;
}

.app-nav__entry {
  flex: 1;
  display: flex;
}

.app-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--m-text-muted);
  transition: var(--m-transition);
}

.app-nav__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 30px;
  transition: var(--m-transition);
}

.app-nav__label {
  font-size: 11px;
  font-weight: var(--m-weight-bold);
  letter-spacing: 0.01em;
}

.app-nav__item--active {
  color: var(--m-ink);
}

/* 选中项：图标底下垫一块撞色方块 —— 不只靠颜色，形状也变化 */
.app-nav__item--active .app-nav__icon {
  background-color: var(--nav-tone, var(--m-red));
  border: var(--m-line);
  box-shadow: 2px 2px 0 0 var(--m-line-color);
}

.app-nav__item--red {
  --nav-tone: var(--m-red);
}

.app-nav__item--pink {
  --nav-tone: var(--m-pink);
}

.app-nav__item--cyan {
  --nav-tone: var(--m-cyan);
}

.app-nav__item--green {
  --nav-tone: var(--m-green);
}

.app-nav__item--yellow {
  --nav-tone: var(--m-yellow);
}

.app-nav__item:active .app-nav__icon {
  transform: translate(2px, 2px);
  box-shadow: none;
}

/* --- 桌面：左侧导航栅 --- */

@media (min-width: 1024px) {
  .app-nav {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: auto;
    width: var(--m-rail);
    height: auto;
    padding: var(--m-6) var(--m-4) var(--m-5);
    border-top: none;
    border-right: var(--m-bw) solid var(--m-chrome-line);
    box-shadow: 5px 0 0 0 var(--m-chrome-line);
    display: flex;
    flex-direction: column;
    gap: var(--m-6);
  }

  .app-nav__brand {
    display: flex;
    align-items: center;
    gap: var(--m-3);
    padding-bottom: var(--m-5);
    border-bottom: var(--m-bw) solid var(--m-chrome-line);
  }

  .app-nav__mark {
    width: 22px;
    height: 22px;
    flex: 0 0 auto;
    background-color: var(--m-red);
    border: 3px solid var(--m-line-color);
  }

  .app-nav__name {
    font-size: var(--m-fs-h3);
    font-weight: var(--m-weight-black);
    letter-spacing: -0.02em;
    color: var(--m-text);
  }

  .app-nav__list {
    flex-direction: column;
    gap: var(--m-3);
    flex: 1;
    align-items: stretch;
  }

  .app-nav__entry {
    flex: 0 0 auto;
  }

  .app-nav__item {
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--m-3);
    padding: var(--m-3) var(--m-4);
    min-height: 48px;
    border: var(--m-bw) solid transparent;
    color: var(--m-text);
    font-size: var(--m-fs-body);
  }

  @media (hover: hover) and (pointer: fine) {
    .app-nav__item:hover {
      background-color: var(--m-yellow);
      border-color: var(--m-line-color);
      color: var(--m-ink);
      box-shadow: var(--m-shadow-xs);
    }

    .app-nav__item:hover .app-nav__icon {
      background-color: transparent;
      border-color: transparent;
      box-shadow: none;
    }
  }

  .app-nav__item:active {
    transform: translate(3px, 3px);
    box-shadow: none;
  }

  .app-nav__icon {
    width: 26px;
    height: 26px;
  }

  .app-nav__label {
    font-size: var(--m-fs-body);
    font-weight: var(--m-weight-bold);
  }

  /* 选中态：整行实心撞色块 + 描边，与 hover 明显区分 */
  .app-nav__item--active {
    background-color: var(--nav-tone, var(--m-red));
    border-color: var(--m-line-color);
    color: var(--m-ink);
    box-shadow: var(--m-shadow-xs);
    font-weight: var(--m-weight-black);
  }

  .app-nav__item--active .app-nav__icon {
    background-color: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .app-nav__foot {
    display: flex;
    flex-direction: column;
    gap: var(--m-3);
    align-items: flex-start;
  }

  .app-nav__foot-band {
    width: 100%;
    height: 14px;
    color: var(--m-text-muted);
  }

  .app-nav__version {
    font-size: var(--m-fs-xs);
    color: var(--m-text-muted);
  }
}
</style>
