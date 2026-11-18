import { createMDX } from 'fumadocs-mdx/next';

/**
 * 静态导出：文档站以腾讯云 EdgeOne Makers 静态导出部署（同 react-okr-tree 站模式），
 * 没有服务端运行时。代价与替代方案：
 * - fumadocs 原生 /api/search 服务端搜索不可用 → route 改 `staticGET` + `force-static`，
 *   构建期把索引固化为 out/api/search 静态文件，前端 RootProvider 用 staticClient 拉取；
 * - OG 图改为 `public/og-image.png` 静态文件，避免静态托管把无扩展名产物识别成 octet-stream；
 * - 图片优化没有服务端 → unoptimized。
 */
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default createMDX()(config);
