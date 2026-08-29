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
  /** 清除指定类型的缓存条目（字典类型被删除后调用，避免残留脏数据） */
  clearDict: (typeCode: string) => void;
  /**
   * 直接写入缓存（不发请求）：字典管理页在自身列表刷新完成后，
   * 复用本次请求结果回填业务侧缓存（refreshDict 会重复发请求，勿在管理页使用）。
   */
  setDict: (typeCode: string, items: DictItem[]) => void;
  /**
   * 强制刷新指定类型的缓存（字典管理页保存后调用，保证业务下拉实时）；
   * 类型已被删除时请求 404，静默忽略（应改用 clearDict）。
   */
  refreshDict: (typeCode: string) => void;
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

  clearDict: (typeCode) => {
    set((state) => {
      if (!(typeCode in state.itemsByCode)) return state;

      const itemsByCode = { ...state.itemsByCode };

      delete itemsByCode[typeCode];

      return { itemsByCode };
    });
  },

  setDict: (typeCode, items) => {
    set((state) => ({
      itemsByCode: { ...state.itemsByCode, [typeCode]: items },
    }));
  },

  refreshDict: (typeCode) => {
    void get()
      .fetchDict(typeCode, true)
      .catch(() => {
        // 静默失败：管理页保存后的联动刷新，不额外打断用户
      });
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
