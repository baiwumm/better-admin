import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { RootProvider } from "fumadocs-ui/provider/next";

import { ScrollTop } from "@/components/motion/scroll-top";
import { JsonLd } from "@/components/seo/json-ld";
import { UI_TRANSLATIONS } from "@/lib/i18n";
import { OG_IMAGE, SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  // 静态导出下每页都必须自报规范地址，避免 http/https、尾斜杠等入口被拆成重复页面
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "Better Admin",
    "Admin",
    "React",
    "Vue",
    "Next.js",
    "Nuxt",
    "NestJS",
    "Drizzle ORM",
    "全栈",
    "文档",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE.url,
    siteName: SITE.name,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      logo: {
        "@type": "ImageObject",
        url: new URL("/logo.svg", SITE.url).toString(),
      },
      sameAs: [SITE.github, SITE.ownerUrl],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      inLanguage: "zh-CN",
      publisher: {
        "@id": `${SITE.url}/#organization`,
      },
    },
  ],
} as const;

export const viewport: Viewport = {
  // 双主题保留，但默认渲染暗色（暗黑终端底 + 朱红），亮色仍可手动切换
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // className="dark" 写进 SSR 产物：首帧即暗色，避免主题脚本接管前闪白。
    // next-themes 仍是唯一主题真源，用户点切换后改成 light 并写入 localStorage。
    <html suppressHydrationWarning className="dark" lang="zh-CN">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <JsonLd data={SITE_JSON_LD} />
        <RootProvider
          i18n={{ locale: "zh-CN", translations: UI_TRANSLATIONS }}
          // type:'static' → fumadocs 用 staticClient 拉取 app/api/search 构建期导出的静态
          // 索引（out/api/search），在浏览器里本地搜索——静态导出无服务端运行时
          search={{ options: { type: "static", api: "/api/search" } }}
          theme={{
            attribute: "class",
            defaultTheme: "dark",
            enableSystem: false,
            disableTransitionOnChange: true,
          }}
        >
          {children}
          {/* 全站浮钮：滚动进度环 + 百分比，点击平滑回顶（文档页与首页都有） */}
          <ScrollTop />
        </RootProvider>
      </body>
    </html>
  );
}
