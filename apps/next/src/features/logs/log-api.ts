"use client";

import type { Log, ListQueryParams } from "@/lib/api-types";
import type { UserInfoUser } from "@/components/common/user-info/user-info";

import { ApiClientError, fetchApi, fetchApiList } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 日志模块 API 层：列表（服务端分页 + 类型筛选）+ 单条删除 + 批量删除（v1.4.8）。
 *
 * - 日志由系统自动写入（login=登录/登出、api=请求拦截器、error=异常、
 *   operation=各管理模块写操作），前端只读 + 人工清理（删除）；
 * - 列表固定 created_at 倒序，后端不支持排序参数；
 * - search 仅匹配 action 字段（后端 ILIKE）。
 */

/** 日志列表查询 key 前缀（分页/搜索/筛选由 useListQuery 拼入 key） */
export const LOGS_QUERY_KEY = ["logs"] as const;

/** 日志列表请求参数 */
export interface LogListParams extends ListQueryParams {
  /** 类型筛选（operation/login/api/error，缺省全部） */
  type?: string;
}

/** GET /logs — 日志分页列表（created_at 倒序） */
export function fetchLogs(params: LogListParams) {
  return fetchApiList<Log>("/logs", params);
}

/** DELETE /logs/:id — 删除单条日志 */
export function deleteLog(id: string) {
  return fetchApi<null>(`/logs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** DELETE /logs?ids= — 批量删除日志（任一 ID 无效后端整体 400 INVALID_OPERATION） */
export function batchDeleteLogs(ids: string[]) {
  const query = ids.map(encodeURIComponent).join(",");

  return fetchApi<null>(`/logs?ids=${query}`, { method: "DELETE" });
}

/** Log 操作人摘要 → UserInfo 组件入参（无关联用户返回 null，显示占位符） */
export function logOperator(log: Log): UserInfoUser | null {
  if (!log.userId || !log.username) return null;

  return {
    username: log.username,
    displayName: log.displayName,
    email: log.email,
    avatar: log.avatar,
  };
}

/**
 * 日志模块错误文案映射：后端 message 仅有中文，按 code 走前端 i18n
 * （未知 code 回退后端 message）。
 */
export function getLogErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "LOG_NOT_FOUND":
      return getErrorMessage("errors.logs.notFound", "日志不存在");
    case "INVALID_OPERATION":
      return getErrorMessage(
        "errors.logs.invalidOperation",
        "部分日志 ID 无效",
      );
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
