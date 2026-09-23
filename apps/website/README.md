# Better Admin — 官方文档站

Better Admin 的官方文档站：**Next 16 静态导出 + fumadocs-core（MDX 管线）+ beUI 风格自建文档组件**（黑白极简风格，与 [theme-switch-animation docs](https://github.com/baiwumm) 同一视觉体系）。

- 在线地址：<https://better-admin.baiwumm.com>（Cloudflare Workers 静态导出）
- UI 层：`components/docs/` 自建组件（docs-shell / sidebar-nav / code-block / search-dialog / toc 等），**不使用 fumadocs-ui**（fumadocs-core 仅承担 MDX 编译、路由与搜索索引生成）
- 内容：`content/**` 手写 MDX，**独立维护、与仓库 `docs/` 不同步**——`docs/` 口径变化时需人工回写本站
- 搜索：构建期预渲染索引（`app/api/search` force-static），纯静态可用
- 图标 / OG：stack 图标由 `scripts/gen-stack-icons.mjs` 从 Simple Icons 生成并提交仓库；og 图片为黑白风格构建期生成

## 常用命令

```bash
pnpm dev      # 开发（with-memory-cap 控制堆内存）
pnpm build    # 静态导出构建（out/，全部路由 force-static 预渲染）
pnpm start    # 本地预览构建产物
```

## 部署

Cloudflare Workers（静态导出）：`wrangler.jsonc` 指向 `out/`，Worker 名 `better-admin`。构建不访问外网；环境变量无服务端密钥。
