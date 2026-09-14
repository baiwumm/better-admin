import type { AppNotification } from "@/lib/api-types";
import type { ListQueryParams } from "@/lib/api-types";

import { fetchApi, fetchApiList } from "@/lib/api-client";

/**
 * 站内信铃铛 API 层（契约 v1.7.0，/notifications，仅登录态）。
 *
 * - unreadCount 供顶栏铃铛轮询（react-query refetchInterval 驱动）；
 * - 数据严格限定当前用户（服务端按 recipientId 过滤）。
 */

/** GET /notifications — 通知列表（分页） */
export function fetchNotifications(
  params: ListQueryParams & { unreadOnly?: boolean } = {},
) {
  return fetchApiList<AppNotification>("/notifications", params);
}

/** GET /notifications/unread-count — 未读数（红点轮询） */
export function fetchUnreadCount() {
  return fetchApi<{ count: number }>("/notifications/unread-count");
}

/** POST /notifications/read-all — 全部已读 */
export function readAllNotifications() {
  return fetchApi<null>("/notifications/read-all", { method: "POST" });
}

/** POST /notifications/:id/read — 单条已读 */
export function readNotification(id: string) {
  return fetchApi<null>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
}
