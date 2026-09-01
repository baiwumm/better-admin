import { create } from "zustand";

import { type AuthUser, type LoginResponse } from "@/lib/api-types";
import { fetchApi } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";

/**
 * 当前用户快照（/auth/me）查询 key。定义在 auth-store（下层）供
 * use-auth-sync（N2）引用，避免 store ↔ hook 循环依赖。
 */
export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * 认证态（Next 适配版）。
 *
 * 与 React 版的核心差异：双令牌存于 httpOnly Cookie（浏览器不可读，
 * 由 proxy / Route Handler 服务端消费），本 store 不持有、不持久化任何
 * token——.isAuthenticated / user 为纯客户端内存态，页面刷新后由
 * 服务端守卫（proxy）+ /auth/me 同步重建。鉴权判定链路：
 * - 受保护页面：proxy 验签 + token_version 实时比对（服务端权威）；
 * - 登录页反向守卫：(auth) 布局 RSC 服务端判定，不再依赖客户端 store；
 * - API 401：api-client 自动经 Cookie 刷新重试（刷新失败整页跳登录）。
 */
interface AuthState {
  user: AuthUser | null;
  /** 记住我（登录时提交；服务端据此签发 30d/1d 长短会话 Cookie） */
  rememberMe: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 真实登录：POST /api/auth/login（rememberMe 对应契约 v1.2 的长短会话分档） */
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  /** 真实退出：POST /api/auth/logout，服务端撤销托管会话并清除 Cookie。 */
  logout: () => Promise<void>;
  /** 覆盖当前用户快照（useAuthSync 的 /auth/me 同步通道，保持 permissions 新鲜）。 */
  setUser: (user: AuthUser) => void;
  /** 清空会话（refresh 失败 / 主动退出统一入口）。 */
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
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
        rememberMe,
        isAuthenticated: true,
        isLoading: false,
      });
      // 登录成功后立即失效用户快照缓存（N2 布局期接管重取）
      queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      // 主动退出禁止触发 401 自动刷新与整页跳登录（allowRetry:false）；
      // 服务端按 Cookie 精确撤销本设备托管会话并清除双令牌 Cookie。
      // 后端注销失败（401/过期）视为会话已失效，本地清理照常进行。
      await fetchApi("/auth/logout", {
        method: "POST",
        allowRetry: false,
      });
    } catch {
      // 忽略后端错误（含 401/网络），本地清理照常进行。
    } finally {
      useAuthStore.getState().clearSession();
    }
  },

  setUser: (user) => {
    set({ user });
  },

  clearSession: () => {
    set({
      user: null,
      rememberMe: false,
      isAuthenticated: false,
    });
    // 用户快照缓存清除（防止换账号登录后命中上一账号的 /auth/me 缓存）
    queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
  },
}));
