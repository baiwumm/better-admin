import { computed } from "vue";

import { buildColumnSettingKey } from "@/components/data-table/column-setting";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 列设置持久化 key：`column-setting:{userId}:{routePath}`（未登录态为 undefined，
 * 列设置退化为会话内生效）。React 端各页面手写 buildColumnSettingKey(userId, path)，
 * Vue 端以 composable 收口读取当前用户。
 */
export function useColumnSettingKey(routePath: string) {
  const auth = useAuthStore();

  return computed(() =>
    auth.user?.id ? buildColumnSettingKey(auth.user.id, routePath) : undefined,
  );
}
