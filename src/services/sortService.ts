/**
 * 排序业务逻辑：按最近添加 / 最近穿着 / 穿着次数 / 名称 / 编号排序。
 */
import type { ClothingListItem } from './clothingService';
import type { SortKey } from '@/models';

/**
 * 各排序方式的默认方向：文本类升序，时间与次数类降序。
 * @param key 排序方式
 * @returns 默认方向
 */
export function defaultDirection(key: SortKey): 'asc' | 'desc' {
  return key === 'name' || key === 'code' ? 'asc' : 'desc';
}

export const sortService = {
  /**
   * 对列表排序（返回新数组，不修改入参）。
   * @param items 衣服列表条目
   * @param key 排序方式
   * @param direction 方向，缺省时按 defaultDirection(key)
   * @returns 排序后的新数组
   */
  async sort(
    items: ClothingListItem[],
    key: SortKey,
    direction?: 'asc' | 'desc'
  ): Promise<ClothingListItem[]> {
    const dir = direction ?? defaultDirection(key);
    const factor = dir === 'asc' ? 1 : -1;
    const sorted = [...items];

    switch (key) {
      case 'recent':
        sorted.sort((a, b) => factor * (a.clothing.createdAt - b.clothing.createdAt));
        break;
      case 'lastWorn':
        // 从未穿过的视为最小时间，降序时始终排在最后
        sorted.sort((a, b) => {
          const left = a.clothing.lastWornAt ?? Number.NEGATIVE_INFINITY;
          const right = b.clothing.lastWornAt ?? Number.NEGATIVE_INFINITY;
          return factor * (left - right);
        });
        break;
      case 'wearCount':
        sorted.sort((a, b) => factor * (a.clothing.wearCount - b.clothing.wearCount));
        break;
      case 'name':
        sorted.sort((a, b) => factor * a.clothing.name.localeCompare(b.clothing.name, 'zh-Hans-CN'));
        break;
      case 'code':
        sorted.sort((a, b) => factor * a.clothing.code.localeCompare(b.clothing.code, 'zh-Hans-CN'));
        break;
      case 'manual':
      default:
        sorted.sort((a, b) => factor * (a.clothing.createdAt - b.clothing.createdAt));
        break;
    }

    return sorted;
  }
};
