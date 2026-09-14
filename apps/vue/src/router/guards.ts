import type { Router } from "vue-router";

import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import { queryClient } from "@/lib/query-client";
import type { MenuNode } from "@/lib/api-types";
import { findMenuPath } from "@/lib/permission";
import { progressRouteBegin } from "@/lib/progress";
import {
  isLoginRequiredPath,
  isMenuRequiredPath,
  isPublicPath,
} from "@/lib/route-access";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 全局前置守卫三层（语义对齐 React 端 beforeLoad + useMenuRouteGuard）：
 *
 * ① 登录拦截：非公共页无 token → /sign-in?redirect=<原目标>；
 *    已登录访问 /sign-in → 直接回首页（同 React (auth) beforeLoad /
 *    Next proxy 反向守卫；redirect 参数只由登录页提交后消费）。
 * ② 会话保障：已登录但内存态为空（F5 刷新）→ ensureSession 恢复
 *    user（/auth/me 快照同步）与菜单缓存。
 * ③ 菜单权限：菜单管理路径按「后端菜单树派生权限」校验；
 *    白名单（LOGIN_REQUIRED_PATHS / 动态前缀）豁免；
 *    菜单未加载或为空时不校验（避免误跳 403 与循环重定向）。
 */
export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    // 路由切换进度条
    progressRouteBegin();

    const auth = useAuthStore();
    const pathname = to.path;

    // 公共页（仅登录页）放行；已登录访问登录页 → 直接回首页。
    // 不消费 redirect 参数：与 React (auth) beforeLoad / Next proxy 一致，
    // 且避免守卫层绕过登录页的 isSafeRedirect 校验。
    // 独立错误页（/403 /404 /500）不在此列——它们要求登录，未登录会落到下方 ①，
    // 与 React 端 beforeLoad / Next 端 proxy.ts 行为一致。
    if (isPublicPath(pathname)) {
      if (pathname === "/sign-in" && auth.isAuthenticated) {
        return { path: "/" };
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

  // 文档标题已迁至根级 useDocumentTitle（App.vue）：订阅路由 + 语言，
  // 切换语言不导航也即时刷新（原 afterEach 只在导航时设置，切语言不更新）。
}
