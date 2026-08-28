import type { DictItem } from "@/lib/api-types";

import { create } from "zustand";
import { useEffect } from "react";

import { fetchApi } from "@/lib/api-client";

/**
 * 全局字典缓存 store：业务页下拉筛选/表单选项统一消费字典数据，
 * 避免硬编码枚举（如用户状态、日志类型）。
 *
 * 数据来源：GET /dict/types/:code/items（全量数组，不分页）。
 * 生命周期：应用会话内缓存；登录用户变更时随会话重建（内存态）。
 */

const EMPTY_ITEMS: DictItem[] = [];

interface DictState {
  /** typeCode → 字典项（保持后端 sort 顺序） */
  itemsByCode: Record<string, DictItem[]>;
  /** 加载中标记（typeCode → boolean），供消费方展示 loading */
  loadingByCode: Record<string, boolean>;
  /**
   * 加载字典（已缓存直接返回；force=true 强制刷新）。
   * 失败时抛错（消费方决定是否提示），不写入缓存。
   */
  fetchDict: (typeCode: string, force?: boolean) => Promise<DictItem[]>;
}

export const useDictStore = create<DictState>()((set, get) => ({
  itemsByCode: {},
  loadingByCode: {},

  fetchDict: async (typeCode, force = false) => {
    const cached = get().itemsByCode[typeCode];

    if (cached && !force) return cached;

    set((state) => ({
      loadingByCode: { ...state.loadingByCode, [typeCode]: true },
    }));
    try {
      const items = await fetchApi<DictItem[]>(
        `/dict/types/${encodeURIComponent(typeCode)}/items`,
      );

      set((state) => ({
        itemsByCode: { ...state.itemsByCode, [typeCode]: items },
        loadingByCode: {
          ...state.loadingByCode,
          [typeCode]: false,
        },
      }));

      return items;
    } catch (error) {
      set((state) => ({
        loadingByCode: { ...state.loadingByCode, [typeCode]: false },
      }));
      throw error;
    }
  },
}));

/**
 * 消费字典的 hook：返回指定类型的字典项（未加载完成时为空数组），
 * 并在 typeCode 变化/首次挂载时自动触发加载（缓存命中则不发请求）。
 */
export function useDict(typeCode: string): DictItem[] {
  const items = useDictStore((state) => state.itemsByCode[typeCode]);

  useEffect(() => {
    void useDictStore
      .getState()
      .fetchDict(typeCode)
      .catch(() => {
        // 静默失败：消费方按空数组渲染，错误经全局拦截器提示
      });
  }, [typeCode]);

  return items ?? EMPTY_ITEMS;
}

/** 取字典项的可选展示文本：优先 i18nKey 翻译，回退 label（与菜单国际化同构）。 */
export function getDictItemLabel(item: DictItem, t: (key: string) => string) {
  return item.i18nKey ? t(item.i18nKey) : item.label;
}
