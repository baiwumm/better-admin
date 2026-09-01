import type { Metadata, Viewport } from "next";

import { cookies } from "next/headers";
import clsx from "clsx";

import { Providers } from "./providers";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-bootstrap";
import { ENV } from "@/lib/env";
import { LANGUAGE_COOKIE_NAME } from "@/stores/language-store";
import { isLanguage } from "@/i18n/config";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: ENV.appName,
    template: `%s - ${ENV.appName}`,
  },
  description: ENV.appDesc,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

/**
 * 根布局（RSC）。
 *
 * - 启动语言：从语言 Cookie 读出并注入 Providers（服务端按请求创建 i18n
 *   实例，与客户端会话实例同语言渲染，无水合偏差、无首屏闪烁）；
 * - 主题偏好：由内联 bootstrap 脚本在首帧前把 localStorage 中的偏好应用到
 *   <html>（明暗 class/data-theme、色板、圆角、色彩模式等），避免深色
 *   主题闪白；store 状态由 Providers 挂载后的 initDesignTheme 幂等同步。
 * - suppressHydrationWarning：bootstrap 脚本与 <html lang> 均在服务端
 *   渲染之外更新 DOM 属性，属预期差异。
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const initialLanguage = isLanguage(cookieLanguage) ? cookieLanguage : "zh-CN";

  return (
    <html suppressHydrationWarning lang={initialLanguage}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        className={clsx(
          "min-h-dvh bg-background font-sans text-foreground antialiased",
        )}
      >
        {/* 色弱模式滤镜节点（styles/color-vision.css 经 url(#better-admin-color-weak) 引用） */}
        <svg
          aria-hidden
          focusable="false"
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <defs>
            <filter
              colorInterpolationFilters="sRGB"
              id="better-admin-color-weak"
            >
              <feColorMatrix
                type="matrix"
                values="0.625 0.375 0 0 0
                  0.7 0.3 0 0 0
                  0 0 0.3 0.7 0
                  0 0 0 1 0"
              />
            </filter>
          </defs>
        </svg>
        <Providers initialLanguage={initialLanguage}>{children}</Providers>
      </body>
    </html>
  );
}
