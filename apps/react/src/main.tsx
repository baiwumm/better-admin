import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { Provider } from "./provider.tsx";
import { router } from "./router.ts";

import { ProgressProvider } from "@/components/common/progress-provider";
import { initI18n } from "@/i18n";
import { queryClient } from "@/lib/query-client";
import { installToastExitAnimation } from "@/lib/toast-animation";
import { bindAuthToApiClient } from "@/stores/auth-store";
import { initDesignTheme } from "@/stores/design-theme-store";
import { initLanguage } from "@/stores/language-store";
import "@/styles/globals.css";

// 将 auth-store 注入 api-client（解耦：api-client 借此读写 token / 触发退出）。
void bindAuthToApiClient();

// toast 退场动画：禁用 toast 根级 VT 后（见 provider.tsx），toast 无 VT 滑动，
// 这里补上 CSS 进出场动画（入场纯 CSS，退场靠队列 close 补丁延迟移除，
// 见 lib/toast-animation.ts）。
installToastExitAnimation();

// 渲染前同步恢复主题色（防止闪烁：CSS 解析时 data-design-theme 已就位）
initDesignTheme();

// 同步读取持久化语言并设置 <html lang>（防止闪烁；翻译初始化见 bootstrap）
const language = initLanguage();

/**
 * 渲染前先完成 i18n 初始化：菜单树可能在首帧前经 useMenus prefetch 到达，
 * t() 必须已可用。资源为静态打包，await 无网络开销。
 */
async function bootstrap(): Promise<void> {
  await initI18n(language);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ProgressProvider>
          <Provider>
            <RouterProvider router={router} />
          </Provider>
        </ProgressProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
