/**
 * 文件保存工具：浏览器走下载，原生（安卓）走「写入缓存目录 + 系统分享面板」。
 *
 * 为什么原生不能沿用 `<a download>`：安卓 WebView 没有实现下载监听
 * （Capacitor 的 CapacitorWebView 未注册 setDownloadListener），
 * 点击链接触发的下载会被静默忽略 —— 不报错，也没有文件。
 * 所以原生环境必须用 Filesystem 落盘，再交给系统分享面板，
 * 用户可以存到「文件」、发微信、传网盘，且不需要任何存储权限。
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { downloadBlob } from './blob';

/** 保存结果 */
export interface SaveFileResult {
  /** 使用的通道 */
  via: 'download' | 'share';
  /** 文件字节数 */
  bytes: number;
}

/**
 * 把字节数格式化成便于阅读的文案。
 * @param bytes 字节数
 * @returns 如 "128 KB" / "3.4 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 保存一个文本文件。
 * 浏览器：直接触发下载；原生：写入缓存目录并弹出系统分享面板。
 * @param text 文件内容
 * @param filename 文件名
 * @param mime MIME 类型
 * @param dialogTitle 原生分享面板的标题
 * @returns 实际使用的通道与文件大小
 * @throws 原生设备不支持分享时抛出错误
 */
export async function saveTextFile(
  text: string,
  filename: string,
  mime: string,
  dialogTitle: string
): Promise<SaveFileResult> {
  const bytes = new Blob([text]).size;

  if (!Capacitor.isNativePlatform()) {
    downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
    return { via: 'download', bytes };
  }

  const written = await Filesystem.writeFile({
    path: filename,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true
  });

  const canShare = await Share.canShare();
  if (!canShare.value) {
    throw new Error('当前设备不支持分享文件，请改用「浏览器打开」再导出');
  }

  await Share.share({
    title: filename,
    text: 'nq的衣柜 数据备份',
    files: [written.uri],
    dialogTitle
  });

  return { via: 'share', bytes };
}
