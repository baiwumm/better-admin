import fs from "node:fs";

// api-types.ts 追加字典实体
const tPath = "src/lib/api-types.ts";
let t = fs.readFileSync(tPath, "utf8");
if (!t.includes("export interface DictType")) {
  t += `
/* ---------------------------------------------------------------------------
 * 字典模块（/dict/*，契约 v1.4：类型/项均无分页，全量数组）
 * ------------------------------------------------------------------------- */

/** 字典类型（以 code 定位，code 创建后不可变更） */
export interface DictType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 字典项（挂在类型下，按 sort、创建时间升序） */
export interface DictItem {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  i18nKey: string | null;
  sort: number;
  enabled: boolean;
}
`;
  fs.writeFileSync(tPath, t);
  console.log("api-types: dict entities added");
}

// dict-store.ts（Pinia 版业务字典缓存）
const storeContent = `import type { DictItem } from "@/lib/api-types";

import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { fetchApi } from "@/lib/api-client";

/**
 * 全局字典缓存 store（语义对齐 React 端 zustand dict-store）：
 * 业务页下拉筛选/表单选项统一消费字典数据，避免硬编码枚举。
 *
 * 生命周期：应用会话内缓存（内存态）；登录用户变更时随会话重建。
 */
export const useDictStore = defineStore("dict", () => {
  const itemsByCode = ref<Record<string, DictItem[]>>({});
  const loadingByCode = ref<Record<string, boolean>>({});

  /** 加载字典（已缓存直接返回；force=true 强制刷新）。失败抛错不写缓存。 */
  async function fetchDict(typeCode: string, force = false): Promise<DictItem[]> {
    const cached = itemsByCode.value[typeCode];

    if (cached && !force) return cached;

    loadingByCode.value[typeCode] = true;

    try {
      const items = await fetchApi<DictItem[]>(
        \`/dict/types/\${encodeURIComponent(typeCode)}/items\`,
      );

      itemsByCode.value[typeCode] = items;

      return items;
    } finally {
      loadingByCode.value[typeCode] = false;
    }
  }

  /** 清除指定类型缓存（类型被删除后调用，避免残留脏数据） */
  function clearDict(typeCode: string) {
    delete itemsByCode.value[typeCode];
  }

  /** 直接写入缓存（字典管理页在自身列表刷新后回填，不重复发请求） */
  function setDict(typeCode: string, items: DictItem[]) {
    itemsByCode.value[typeCode] = items;
  }

  /** 强制刷新（404 静默忽略；应改用 clearDict） */
  function refreshDict(typeCode: string) {
    void fetchDict(typeCode, true).catch(() => {
      /* 404：类型已被删除 */
    });
  }

  /** 读取指定类型的字典项（响应式） */
  const items = (typeCode: string) =>
    computed(() => itemsByCode.value[typeCode] ?? []);

  return { itemsByCode, loadingByCode, fetchDict, clearDict, setDict, refreshDict, items };
});
`;

fs.writeFileSync("src/stores/dict-store.ts", storeContent);
console.log("dict-store written");

// dict-api.ts
const apiContent = `import type { DictItem, DictType } from "@/lib/api-types";

import { ApiClientError, fetchApi } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 字典模块 API 层：字典类型与字典项 CRUD（契约 v1.4，无分页，全量数组）。
 *
 * - 类型以 code 定位（PUT/DELETE /dict/types/:code），code 创建后不可变更；
 * - 字典项挂在类型下：GET/POST /dict/types/:code/items；
 * - 清空可选字段（description / i18nKey）须传空字符串 ""：后端为
 *   「部分更新 + ?? 兜底」语义，null 会被校验拒绝。
 */

/** 字典类型列表查询 key（管理页专用） */
export const DICT_TYPES_QUERY_KEY = ["dict", "types"] as const;

/** 字典项列表查询 key（按 typeCode 隔离，便于精准失效） */
export const dictItemsQueryKey = (typeCode: string) =>
  ["dict", "items", typeCode] as const;

/** GET /dict/types — 字典类型全量列表（按创建时间升序） */
export function fetchDictTypes() {
  return fetchApi<DictType[]>("/dict/types");
}

/** GET /dict/types/:code/items — 指定类型的字典项（按 sort、创建时间升序） */
export function fetchDictItems(typeCode: string) {
  return fetchApi<DictItem[]>(
    \`/dict/types/\${encodeURIComponent(typeCode)}/items\`,
  );
}

/** 字典类型创建载荷 */
export interface DictTypeCreateInput {
  code: string;
  name: string;
  description?: string;
}

/** 字典类型更新载荷（code 不可变更；description 传 "" 表示清空） */
export interface DictTypeUpdateInput {
  name: string;
  description?: string;
}

/** 字典项创建/更新载荷（i18nKey 传 "" 表示清空） */
export interface DictItemSaveInput {
  value: string;
  label: string;
  i18nKey?: string;
  sort: number;
  enabled: boolean;
}

/** POST /dict/types — 创建字典类型 */
export function createDictType(input: DictTypeCreateInput) {
  return fetchApi<DictType>("/dict/types", { method: "POST", body: input });
}

/** PUT /dict/types/:code — 编辑字典类型 */
export function updateDictType(code: string, input: DictTypeUpdateInput) {
  return fetchApi<DictType>(\`/dict/types/\${encodeURIComponent(code)}\`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /dict/types/:code — 删除字典类型（仍被字典项引用时后端 409 拦截） */
export function deleteDictType(code: string) {
  return fetchApi<null>(\`/dict/types/\${encodeURIComponent(code)}\`, {
    method: "DELETE",
  });
}

/** POST /dict/types/:code/items — 新增字典项 */
export function createDictItem(typeCode: string, input: DictItemSaveInput) {
  return fetchApi<DictItem>(
    \`/dict/types/\${encodeURIComponent(typeCode)}/items\`,
    { method: "POST", body: input },
  );
}

/** PUT /dict/items/:id — 编辑字典项 */
export function updateDictItem(id: string, input: DictItemSaveInput) {
  return fetchApi<DictItem>(\`/dict/items/\${encodeURIComponent(id)}\`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /dict/items/:id — 删除字典项 */
export function deleteDictItem(id: string) {
  return fetchApi<null>(\`/dict/items/\${encodeURIComponent(id)}\`, {
    method: "DELETE",
  });
}

/**
 * 字典模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n。
 */
export function getDictErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "DICT_TYPE_IN_USE":
      return getErrorMessage(
        "errors.dict.typeInUse",
        "该字典类型下仍有字典项，无法删除",
      );
    case "DICT_TYPE_CODE_EXISTS":
      return getErrorMessage(
        "errors.dict.typeCodeExists",
        "字典类型 code 已存在",
      );
    case "DICT_ITEM_VALUE_EXISTS":
      return getErrorMessage(
        "errors.dict.itemValueExists",
        "该字典类型下 value 已存在",
      );
    case "DICT_ITEM_LABEL_EXISTS":
      return getErrorMessage(
        "errors.dict.labelExists",
        "该字典类型下 label 已存在",
      );
    case "DICT_TYPE_NOT_FOUND":
      return getErrorMessage("errors.dict.typeNotFound", "字典类型不存在");
    case "DICT_ITEM_NOT_FOUND":
      return getErrorMessage("errors.dict.itemNotFound", "字典项不存在");
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
`;

fs.writeFileSync("src/features/dicts/dict-api.ts", apiContent);
console.log("dict-api written");
