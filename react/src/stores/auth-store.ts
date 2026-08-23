import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type AuthUser, type LoginResponse } from "@/lib/api-types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Mock 登录：仅校验非空；接入后端后替换为 POST /auth/login */
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetAuth: () => void;
}

/** Mock Token（接入后端后替换为真实 accessToken / refreshToken）。 */
const MOCK_ACCESS_TOKEN = "mock-access-token";
const MOCK_REFRESH_TOKEN = "mock-refresh-token";

/** Mock 用户：super_admin 全权限（位掩码与后端 -1n 归一化一致）。 */
function buildMockUser(username: string): AuthUser {
  return {
    id: "u_mock_1",
    username,
    displayName: username === "admin" ? "管理员" : username,
    roles: ["super_admin"],
    permissions: "9223372036854775807",
  };
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        // Mock 登录：非空即通过；后续替换为真实 API 调用
        if (!username.trim() || !password) {
          set({ isLoading: false });
          throw new Error("请输入用户名和密码");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        const user = buildMockUser(username.trim());
        const res: LoginResponse = {
          accessToken: MOCK_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
          user,
        };

        localStorage.setItem("accessToken", res.accessToken);
        localStorage.setItem("refreshToken", res.refreshToken);
        set({
          user: res.user,
          accessToken: res.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        clearTokens();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      resetAuth: () => {
        clearTokens();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      // 仅持久化非方法字段，避免存储膨胀
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

/**
 * 会话是否有效（beforeLoad 鉴权用）：
 * Mock 模式下 accessToken 存在即视为已登录。
 */
export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().accessToken);
}
