import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type AuthUser, type LoginResponse } from "@/lib/api-types";
import { fetchApi, bindAuthSnapshot } from "@/lib/api-client";
import { fetchMenus } from "@/lib/menu-fetch";
import { queryClient } from "@/lib/query-client";
import { MENUS_QUERY_KEY } from "@/hooks/use-menus";
import { useTabsStore } from "@/stores/tabs-store";

/**
 * 当前用户快照（/auth/me）查询 key。定义在 auth-store（下层）供
 * use-auth-sync 引用，避免 store ↔ hook 循环依赖。
 */
export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /**
   * refreshToken 仅存内存，不持久化（安全默认：关闭页面后需重新登录）。
   * 勾选「记住我」登录时例外：随 rememberMe 一并持久化（见 partialize）。
   */
  refreshToken: string | null;
  /** 记住我：true 时 refreshToken 长效并持久化，支持跨浏览器会话静默续期。 */
  rememberMe: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 真实登录：POST /api/auth/login（rememberMe 对应契约 v1.2 的长短会话分档） */
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  /** 真实退出：POST /api/auth/logout（带 token），成功后清本地会话。 */
  logout: () => Promise<void>;
  /** 供 api-client 刷新流程写入新 accessToken（不触发持久化副作用之外的行为）。 */
  setTokens: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  /** 覆盖当前用户快照（useAuthSync 的 /auth/me 同步通道，保持 permissions 新鲜）。 */
  setUser: (user: AuthUser) => void;
  /** 清空会话（refresh 失败 / 主动退出统一入口）。 */
  clearSession: () => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      rememberMe: false,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password, rememberMe = false) => {
        set({ isLoading: true });
        try {
          const res = await fetchApi<LoginResponse>("/auth/login", {
            method: "POST",
            auth: false,
            body: { username: username.trim(), password, rememberMe },
          });

          set({
            user: res.user,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            rememberMe,
            isAuthenticated: true,
            isLoading: false,
          });

          // 登录成功后立即预取菜单缓存：路由 beforeLoad 可同步判定权限
          // （避免首次进入业务页时因菜单未就绪而多一次 loading 跳转）。
          void queryClient.prefetchQuery({
            queryKey: MENUS_QUERY_KEY,
            queryFn: fetchMenus,
            staleTime: 60_000,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();

        try {
          // 仅在仍有 token 时调用后端 logout；无 token 直接清本地。
          // allowRetry:false —— 关键：退出是主动行为，禁止触发 401 自动刷新
          // 与整页跳登录（否则 accessToken 过期时会被动跳走，表现为异常跳转）。
          // 后端注销失败（401/过期）视为会话已失效，本地照常清理。
          // 带 refreshToken：服务端精确撤销本设备托管会话（契约 v1.2）。
          if (accessToken) {
            await fetchApi("/auth/logout", {
              method: "POST",
              allowRetry: false,
              body: refreshToken ? { refreshToken } : {},
            });
          }
        } catch {
          // 忽略后端错误（含 401/网络），本地清理照常进行。
        } finally {
          get().clearSession();
        }
      },

      setTokens: ({ accessToken, refreshToken }) => {
        set((state) => ({
          accessToken,
          refreshToken:
            refreshToken === undefined ? state.refreshToken : refreshToken,
        }));
      },

      setUser: (user) => {
        set({ user });
      },

      clearSession: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          rememberMe: false,
          isAuthenticated: false,
        });
        // 会话结束同时清空多标签页（标签属于用户级 UI 态，不跨会话残留）
        // 与用户快照缓存（防止换账号登录后命中上一账号的 /auth/me 缓存）。
        useTabsStore.getState().resetTabs();
        queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
      },

      resetAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          rememberMe: false,
          isAuthenticated: false,
        });
        queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
      },
    }),
    {
      name: "auth-storage",
      // 仅持久化非敏感会话字段。
      // refreshToken 默认不持久化（安全默认：关浏览器即失效）；
      // 勾选「记住我」登录后随 rememberMe 一并持久化，跨浏览器会话静默续期。
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        ...(state.rememberMe
          ? { rememberMe: true, refreshToken: state.refreshToken }
          : {}),
      }),
    },
  ),
);

/**
 * 绑定 auth-store 快照给 api-client（解耦：api-client 不 import React hook）。
 * 在应用启动时调用一次（见 main.tsx）。
 */
export function bindAuthToApiClient() {
  bindAuthSnapshot({
    get accessToken() {
      return useAuthStore.getState().accessToken;
    },
    get refreshToken() {
      return useAuthStore.getState().refreshToken;
    },
    setTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
    clearSession: () => useAuthStore.getState().clearSession(),
  });
}

/**
 * 会话是否有效（beforeLoad 鉴权用）：
 * accessToken 存在即视为已登录（JWT 过期由 api-client 401 刷新兜底）。
 */
export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().accessToken);
}
