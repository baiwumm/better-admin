import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { Provider } from "./provider.tsx";
import { router } from "./router.ts";

import { queryClient } from "@/lib/query-client";
import { bindAuthToApiClient } from "@/stores/auth-store";
import { initDesignTheme } from "@/stores/design-theme-store";
import "@/styles/globals.css";

// 将 auth-store 注入 api-client（解耦：api-client 借此读写 token / 触发退出）。
void bindAuthToApiClient();

// 渲染前同步恢复主题色（防止闪烁：CSS 解析时 data-design-theme 已就位）
initDesignTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <RouterProvider router={router} />
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>,
);
