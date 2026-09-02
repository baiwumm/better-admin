"use client";

import type { DictItem, DictType } from "@/lib/api-types";

import { ApiClientError, fetchApi } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 字典模块 API 层：字典类型与字典项 CRUD（契约 v1.4，无分页，全量数组）。
 *
 * - 类型以 code 定位（PUT/DELETE /dict/types/:code），code 创建后不可变更；
 * - 字典项挂在类型下：GET/POST /dict/types/:code/items；
 * - 清空可选字段（description / i18nKey）须传空字符串 ""：后端为
 *   「部分更新 + ?? 兜底」语义，null 会被校验拒绝（见 dict.service.ts）。
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
    `/dict/types/${encodeURIComponent(typeCode)}/items`,
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
  return fetchApi<DictType>(`/dict/types/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /dict/types/:code — 删除字典类型（仍被字典项引用时后端 409 拦截） */
export function deleteDictType(code: string) {
  return fetchApi<null>(`/dict/types/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

/** POST /dict/types/:code/items — 新增字典项 */
export function createDictItem(typeCode: string, input: DictItemSaveInput) {
  return fetchApi<DictItem>(
    `/dict/types/${encodeURIComponent(typeCode)}/items`,
    { method: "POST", body: input },
  );
}

/** PUT /dict/items/:id — 编辑字典项 */
export function updateDictItem(id: string, input: DictItemSaveInput) {
  return fetchApi<DictItem>(`/dict/items/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /dict/items/:id — 删除字典项 */
export function deleteDictItem(id: string) {
  return fetchApi<null>(`/dict/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * 字典模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n
 * （与错误码一一对应；未知 code 回退后端 message）。
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
    case "DICT_TYPE_NOT_FOUND":
      return getErrorMessage("errors.dict.typeNotFound", "字典类型不存在");
    case "DICT_ITEM_NOT_FOUND":
      return getErrorMessage("errors.dict.itemNotFound", "字典项不存在");
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
