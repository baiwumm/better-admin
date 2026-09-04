import type { AuthUser, LoginResponse, MenuNode } from "@/lib/api-types";

import { ref, watch } from "vue";
import { defineStore } from "pinia";

import { fetchApi, bindAuthSnapshot } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { MENUS_QUERY_KEY, menusQueryOptions } from "@/composables/use-menus";

/**
 * 当前用户快照（/auth/me）查询 key。定义在 auth-store（下层）供
 * use-auth-sync 引用，避免 store ↔ hook 循环依赖。
 */
export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

const AUTH_STORAGE_KEY = "auth-storage";

interface PersistedAuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  /** 仅 rememberMe 登录时持久化（安全默认：关浏览器即失效）。 */
  refreshToken?: string | null;
}

/**
 * 认证会话 store（Pinia setup store，语义与 React 端 zustand auth-store 对齐）：
 * - login：POST /auth/login（rememberMe 对应契约 v1.2 长短会话分档），
 *   成功后预取菜单缓存（路由守卫可同步判权）。
 * - logout：POST /auth/logout（allowRetry=false，禁止被动 401 跳转）。
 * - 持久化：localStorage 仅存非敏感字段；refreshToken 默认仅内存，
 *   勾选「记住我」时随 rememberMe 一并持久化支持跨会话静默续期。
 */
export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const rememberMe = ref(false);
  const isAuthenticated = ref(false);
  const isLoading = ref(false);

  // ---- 持久化（partialize 语义对齐 React 端 zustand persist）----

  function restoreSession() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);

      if (!raw) return;

      const parsed = JSON.parse(raw) as PersistedAuthState;

      user.value = parsed.user ?? null;
      accessToken.value = parsed.accessToken ?? null;
      isAuthenticated.value = parsed.isAuthenticated ?? false;
      rememberMe.value = parsed.rememberMe ?? false;
      refreshToken.value = parsed.refreshToken ?? null;
    } catch {
      // 损坏的持久化数据按未登录处理
    }
  }

  function persistSession() {
    const payload: PersistedAuthState = {
      user: user.value,
      accessToken: accessToken.value,
      isAuthenticated: isAuthenticated.value,
      rememberMe: rememberMe.value,
      ...(rememberMe.value ? { refreshToken: refreshToken.value } : {}),
    };

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // 存储不可用（隐私模式等）时降级为内存会话
    }
  }

  restoreSession();

  watch(
    [user, accessToken, refreshToken, rememberMe, isAuthenticated],
    () => persistSession(),
    { deep: true },
  );

  // ---- 会话行为 ----

  async function login(
    username: string,
    password: string,
    shouldRemember = false,
  ) {
    isLoading.value = true;

    try {
      const res = await fetchApi<LoginResponse>("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          username: username.trim(),
          password,
          rememberMe: shouldRemember,
        },
      });

      user.value = res.user;
      accessToken.value = res.accessToken;
      refreshToken.value = res.refreshToken;
      rememberMe.value = shouldRemember;
      isAuthenticated.value = true;

      // 登录成功后立即预取菜单缓存：路由守卫可同步判定权限
      // （避免首次进入业务页时因菜单未就绪而多一次 loading 跳转）。
      void queryClient.prefetchQuery(menusQueryOptions());
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      // 仅在仍有 token 时调用后端 logout；无 token 直接清本地。
      // allowRetry:false —— 退出是主动行为，禁止触发 401 自动刷新与整页跳登录。
      if (accessToken.value) {
        await fetchApi("/auth/logout", {
          method: "POST",
          allowRetry: false,
          body: refreshToken.value ? { refreshToken: refreshToken.value } : {},
        });
      }
    } catch {
      // 忽略后端错误（含 401/网络），本地清理照常进行。
    } finally {
      clearSession();
    }
  }

  /** 供 api-client 刷新流程写入新 accessToken（refreshToken undefined 时保持原值）。 */
  function setTokens(tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) {
    accessToken.value = tokens.accessToken;

    if (tokens.refreshToken !== undefined) {
      refreshToken.value = tokens.refreshToken;
    }
  }

  /** 覆盖当前用户快照（useAuthSync 的 /auth/me 同步通道，保持 permissions 新鲜）。 */
  function setUser(nextUser: AuthUser) {
    user.value = nextUser;
  }

  /**
   * 清空会话（refresh 失败 / 主动退出统一入口）。
   * 同时清用户级缓存：/auth/me 快照（防换账号命中上一账号快照）
   * 与菜单树（staleTime 60s 内换账号命中上一账号菜单缓存）。
   */
  function clearSession() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    rememberMe.value = false;
    isAuthenticated.value = false;

    // 多标签页属于用户级 UI 态，不跨会话残留（M1 接入 tabs-store 时同步 reset）
    queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    queryClient.removeQueries({ queryKey: MENUS_QUERY_KEY });
  }

  /**
   * 会话保障（路由守卫在已登录但内存为空时调用，即 F5 刷新恢复场景）：
   * - 无 user：拉 GET /auth/me 恢复并同步最新权限快照（mechanisms §6 语义）；
   * - 无菜单缓存：ensureQueryData 拉取菜单树（与侧边栏 useMenus 共享缓存）。
   * 401 由 api-client 统一处理（清会话 + 跳登录）；其余错误保守降级放行。
   */
  async function ensureSession() {
    if (!accessToken.value) return;

    if (!user.value) {
      try {
        user.value = await fetchApi<AuthUser>("/auth/me");
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status?: number }).status === 401
        ) {
          return; // 会话已失效且已由 api-client 跳转登录
        }
      }
    }

    const cachedMenus = queryClient.getQueryData<MenuNode[]>(MENUS_QUERY_KEY);

    if (!cachedMenus) {
      try {
        await queryClient.ensureQueryData(menusQueryOptions());
      } catch {
        // 菜单拉取失败：守卫按「菜单不可用」放行（不误跳 403）
      }
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    rememberMe,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setTokens,
    setUser,
    clearSession,
    ensureSession,
  };
});

/**
 * 绑定 auth-store 快照给 api-client（解耦：api-client 不 import store）。
 * 在应用启动时调用一次（见 main.ts）。
 */
export function bindAuthToApiClient() {
  bindAuthSnapshot({
    get accessToken() {
      const store = useAuthStore();

      return store.accessToken;
    },
    get refreshToken() {
      const store = useAuthStore();

      return store.refreshToken;
    },
    setTokens: (tokens) => useAuthStore().setTokens(tokens),
    clearSession: () => useAuthStore().clearSession(),
  });
}

/**
 * 会话是否有效（守卫鉴权用）：
 * accessToken 存在即视为已登录（JWT 过期由 api-client 401 刷新兜底）。
 */
export function isAuthenticatedSync(): boolean {
  return Boolean(useAuthStore().accessToken);
}
