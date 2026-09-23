import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { source } from '@/lib/source';

// 静态导出（output:'export'）要求显式 force-static：build 期预渲染为 out/sitemap.xml
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, SITE.url).toString();

  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    ...source.getPages().map((page) => ({
      url: url(page.url),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
