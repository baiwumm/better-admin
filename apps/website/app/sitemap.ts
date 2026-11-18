import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";
import { source } from "@/lib/source";

// 静态导出（output:'export'）要求显式 force-static：build 期预渲染为 out/sitemap.xml
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // 与 next.config 的 trailingSlash 保持一致，避免 sitemap 指向非规范入口
  const url = (path: string) =>
    new URL(
      path === "/" || path.endsWith("/") ? path : `${path}/`,
      SITE.url,
    ).toString();

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    ...source.getPages().map((page) => ({
      url: url(page.url),
      lastModified: page.data.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
