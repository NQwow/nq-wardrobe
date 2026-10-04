/**
 * 路由配置：全部使用 hash 模式，保证 Capacitor 打包后不会 404。
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/** 路由元信息类型扩展 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 所属底部导航 tab，缺省表示不显示底部导航 */
    tab?: 'wardrobe' | 'favorites' | 'outfit' | 'diary' | 'settings';
    /** 页面标题（写入 document.title 的备用值） */
    title?: string;
  }
}

/** 路由表 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'wardrobe',
    component: () => import('@/views/WardrobeView.vue'),
    meta: { tab: 'wardrobe', title: '我的衣柜' }
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { tab: 'favorites', title: '收藏' }
  },
  {
    path: '/outfit',
    name: 'outfit',
    component: () => import('@/views/OutfitView.vue'),
    meta: { tab: 'outfit', title: '搭配' }
  },
  {
    path: '/outfit/:id',
    name: 'outfit-detail',
    component: () => import('@/views/OutfitDetailView.vue'),
    meta: { title: '搭配详情' }
  },
  {
    path: '/diary',
    name: 'diary',
    component: () => import('@/views/DiaryView.vue'),
    meta: { tab: 'diary', title: '穿搭日记' }
  },
  {
    path: '/diary/new',
    name: 'diary-new',
    component: () => import('@/views/DiaryEditView.vue'),
    meta: { title: '记录穿搭' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { tab: 'settings', title: '设置' }
  },
  /* 注意：/clothing/new 必须排在 /clothing/:id 之前 */
  {
    path: '/clothing/new',
    name: 'clothing-new',
    component: () => import('@/views/ClothingEditView.vue'),
    meta: { title: '新增衣服' }
  },
  {
    path: '/clothing/:id',
    name: 'clothing-detail',
    component: () => import('@/views/ClothingDetailView.vue'),
    meta: { title: '衣服详情' }
  },
  {
    path: '/clothing/:id/edit',
    name: 'clothing-edit',
    component: () => import('@/views/ClothingEditView.vue'),
    meta: { title: '编辑衣服' }
  },
  {
    path: '/wardrobes',
    name: 'wardrobes',
    component: () => import('@/views/WardrobeManageView.vue'),
    meta: { title: '衣柜管理' }
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/TagManageView.vue'),
    meta: { title: '标签管理' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

/** 全局路由实例 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

export default router;
