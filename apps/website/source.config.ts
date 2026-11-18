import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content",
  docs: {
    // 构建期从 git 读取每篇文档的最后修改时间，供页面展示、JSON-LD 与 sitemap 使用
    lastModified: true,
  },
});

export default defineConfig();
