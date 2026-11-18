import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// 静态导出（output:'export'）要求显式 force-static：build 期预渲染为 out/robots.txt
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 搜索索引是构建期静态 JSON，不是页面，避免爬虫把 /api/search 当正文抓取
      disallow: "/api/",
    },
    sitemap: new URL("/sitemap.xml", SITE.url).toString(),
  };
}
