/**
 * 全局类型声明：让 TypeScript 认识 .vue 单文件组件与 Vite 注入的环境变量。
 */
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
