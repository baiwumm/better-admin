import type {
  Notice,
  NoticeCreateInput,
  NoticeDetail,
  NoticeReadStatEntry,
  NoticeStatus,
  NoticeUpdateInput,
} from "@/lib/api-types";
import type { ListQueryParams } from "@/lib/api-types";

import { ApiClientError, fetchApi, fetchApiList } from "@/lib/api-client";
import { getErrorMessage } from "@/i18n";

/**
 * 公告 API 层（契约 v1.7.0 阶段 3，/notices*）。
 *
 * - 管理接口走位掩码权限（SEARCH/ADD/EDIT/DELETE）；
 * - mine / 详情为全员消费接口（仅登录态，服务端做可见性校验）；
 * - 进详情（fetchNoticeDetail）时服务端自动记录首次已读；
 * - 编辑/删除/撤回/催办要求发布人本人或 super_admin（403 NOTICE_NOT_PUBLISHER）。
 */

/** 公告管理列表查询参数 */
export interface NoticeListParams extends ListQueryParams {
  keyword?: string;
  status?: NoticeStatus;
  sort?: string;
  order?: "asc" | "desc";
}

/** 我的公告列表查询参数（个人消费端） */
export interface MyNoticeListParams extends ListQueryParams {
  keyword?: string;
  readStatus?: "all" | "read" | "unread";
}

/** GET /notices — 公告管理列表（分页，含已读率） */
export function fetchNotices(params: NoticeListParams = {}) {
  return fetchApiList<Notice>("/notices", params);
}

/** GET /notices/mine — 我的公告（全员消费端，置顶在前） */
export function fetchMyNotices(params: MyNoticeListParams = {}) {
  return fetchApiList<Notice>("/notices/mine", params);
}

/** GET /notices/:id — 公告详情（范围内用户进详情自动记已读） */
export function fetchNoticeDetail(id: string) {
  return fetchApi<NoticeDetail>(`/notices/${encodeURIComponent(id)}`);
}

/** POST /notices — 发布公告（publishTime 未来 = 定时草稿） */
export function createNotice(input: NoticeCreateInput) {
  return fetchApi<NoticeDetail>("/notices", { method: "POST", body: input });
}

/** PUT /notices/:id — 编辑公告 */
export function updateNotice(id: string, input: NoticeUpdateInput) {
  return fetchApi<NoticeDetail>(`/notices/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: input,
  });
}

/** DELETE /notices/:id — 删除公告（软删） */
export function deleteNotice(id: string) {
  return fetchApi<null>(`/notices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** POST /notices/:id/withdraw — 撤回公告 */
export function withdrawNotice(id: string) {
  return fetchApi<NoticeDetail>(`/notices/${encodeURIComponent(id)}/withdraw`, {
    method: "POST",
  });
}

/** GET /notices/:id/read-stats — 已读/未读名单（分页） */
export function fetchNoticeReadStats(
  id: string,
  status: "read" | "unread",
  page = 1,
  pageSize = 10,
) {
  return fetchApiList<NoticeReadStatEntry>(
    `/notices/${encodeURIComponent(id)}/read-stats`,
    { status, page, pageSize },
  );
}

/** POST /notices/:id/remind — 一键催办（24h 防频） */
export function remindNotice(id: string) {
  return fetchApi<{ remindedCount: number }>(
    `/notices/${encodeURIComponent(id)}/remind`,
    { method: "POST" },
  );
}

/** 公告模块错误文案映射（按 code 走 i18n；未知 code 回退后端 message） */
export function getNoticeErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : undefined;

  switch (code) {
    case "NOTICE_NOT_FOUND":
      return getErrorMessage("errors.notices.notFound", "公告不存在");
    case "NOTICE_NOT_PUBLISHER":
      return getErrorMessage(
        "errors.notices.notPublisher",
        "仅发布人本人或超级管理员可操作该公告",
      );
    case "NOTICE_NOT_PUBLISHED":
      return getErrorMessage(
        "errors.notices.notPublished",
        "仅已发布的公告可撤回",
      );
    case "NOTICE_NOT_VISIBLE":
      return getErrorMessage(
        "errors.notices.notVisible",
        "您不在该公告的发布范围内",
      );
    case "NOTICE_REMIND_TOO_FREQUENT":
      return getErrorMessage(
        "errors.notices.remindTooFrequent",
        "24 小时内已催办过，请稍后再试",
      );
    case "NOTICE_NO_UNREAD":
      return getErrorMessage(
        "errors.notices.noUnread",
        "没有需要催办的未读人员",
      );
    case "VALIDATION_ERROR":
      return error instanceof Error ? error.message : String(error);
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
