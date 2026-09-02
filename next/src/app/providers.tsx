"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toast } from "@heroui/react";
import { ProgressProvider } from "@bprogress/next/app";
import { useProgress } from "@bprogress/next";

import { createI18nInstance, i18n as sessionI18n, initI18n } from "@/i18n";
import { initDesignTheme } from "@/stores/design-theme-store";
import { queryClient } from "@/lib/query-client";
import { bindProgress } from "@/lib/progress";

export interface ProvidersProps {
  /** 启动语言（根 layout 从语言 Cookie 读出，缺省简体中文） */
  initialLanguage?: string;
  children: React.ReactNode;
}

/**
 * 将 useProgress 的 start/stop 注入非 React 模块（api-client）。
 * 必须在 AppProgressProvider 子树内调用。
 */
function ProgressBinder() {
  const { start, stop } = useProgress();

  useEffect(() => {
    bindProgress({ start, stop });
  }, [start, stop]);

  return null;
}

/**
 * 根 Providers（客户端组件，SSR 期同样执行）。
 *
 * - i18n：浏览器端初始化模块单例（即会话实例，setLanguage 切换的正是它）；
 *   服务端每次 SSR 以本次请求的启动语言创建独立实例（避免模块单例跨请求
 *   污染其他用户的语言），两端注入 Provider 的实例语言一致 → 水合输出一致。
 * - 服务端数据：React Query 统一管理列表/菜单等请求的缓存与去重。
 * - 主题偏好：挂载后 initDesignTheme() 同步 store 状态并注册系统偏好监听
 *   （DOM 属性已由 layout 内联 bootstrap 脚本在首帧前应用，此处幂等）。
 * - 进度条：@bprogress/next 内置 App Router 路由监听，导航自动 start/stop。
 */
export function Providers({ initialLanguage, children }: ProvidersProps) {
  const isBrowser = typeof window !== "undefined";

  // 浏览器端：模块单例即会话实例（幂等初始化）；服务端跳过（经独立实例注入）
  if (isBrowser) initI18n(initialLanguage);

  useEffect(() => {
    initDesignTheme();
  }, []);

  return (
    <I18nextProvider
      i18n={isBrowser ? sessionI18n : createI18nInstance(initialLanguage)}
    >
      <QueryClientProvider client={queryClient}>
        <ProgressProvider
          disableSameURL
          shallowRouting
          color="var(--accent)"
          delay={200}
          height="2px"
          startPosition={0.3}
          stopDelay={0}
        >
          <ProgressBinder />
          <Toast.Provider placement="top" />
          {children}
        </ProgressProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
