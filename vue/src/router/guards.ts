import type { Router } from "vue-router";

import { ENV } from "@/lib/env";
import { i18n } from "@/i18n";
import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import { queryClient } from "@/lib/query-client";
import type { MenuNode } from "@/lib/api-types";
import { findMenuPath } from "@/lib/permission";
import {
  isLoginRequiredPath,
  isMenuRequiredPath,
  isPublicPath,
  ROUTE_TITLE_KEYS,
} from "@/lib/route-access";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 全局前置守卫三层（语义对齐 React 端 beforeLoad + useMenuRouteGuard）：
 *
 * ① 登录拦截：非公共页无 token → /sign-in?redirect=<原目标>；
 *    已登录访问 /sign-in → 回跳 redirect 或首页。
 * ② 会话保障：已登录但内存态为空（F5 刷新）→ ensureSession 恢复
 *    user（/auth/me 快照同步）与菜单缓存。
 * ③ 菜单权限：菜单管理路径按「后端菜单树派生权限」校验；
 *    白名单（LOGIN_REQUIRED_PATHS / 动态前缀）豁免；
 *    菜单未加载或为空时不校验（避免误跳 403 与循环重定向）。
 */
export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    const pathname = to.path;

    // 公共页（登录页 / 错误页）放行；已登录访问登录页 → 回跳
    if (isPublicPath(pathname)) {
      if (pathname === "/sign-in" && auth.isAuthenticated) {
        return { path: readRedirectTarget(to) ?? "/" };
      }

      return true;
    }

    // ① 登录拦截（带 redirect 回跳参数）
    if (!auth.accessToken) {
      return { path: "/sign-in", query: { redirect: to.fullPath } };
    }

    // ② 会话保障（刷新恢复 + /auth/me 快照同步）
    await auth.ensureSession();

    // ③ 菜单权限（白名单豁免；菜单为空视为不可用，放行避免误杀）
    if (isMenuRequiredPath(pathname) && !isLoginRequiredPath(pathname)) {
      const menus = queryClient.getQueryData<MenuNode[]>(MENUS_QUERY_KEY);

      if (menus && menus.length > 0 && !findMenuPath(menus, pathname)) {
        return { path: "/403" };
      }
    }

    return true;
  });

  // 文档标题：路径 → menu.pageTitle.* i18n 键（React route titleKey 等价物）
  router.afterEach((to) => {
    const titleKey = ROUTE_TITLE_KEYS[to.path];
    const title = titleKey ? i18n.global.t(titleKey) : "";

    document.title = title ? `${title} · ${ENV.appName}` : ENV.appName;
  });
}

/** 读取 redirect query（仅接受站内安全路径，登录页跳转前再做 isSafeRedirect 校验）。 */
function readRedirectTarget(to: {
  query: Record<string, unknown>;
}): string | undefined {
  const redirect = to.query.redirect;

  return typeof redirect === "string" ? redirect : undefined;
}
