# Better Admin — 官方文档站

Better Admin 的官方文档站：**Next 16 静态导出 + fumadocs-core（MDX 管线）+ beUI 组件层**（黑白极简风格）。

- 在线地址：<https://better-admin.baiwumm.com>（Cloudflare Workers 静态导出）
- UI 分层（2026-09-23 定稿）：**首页（landing）用 beUI**——按钮与徽章是 [beUI registry](https://beui.dev) 的上游源码组件（`components/motion/button/base.tsx`、`components/motion/animated-badge.tsx`，copy-paste 落盘、**零样式覆写**，只保留布局类），FAQ 手风琴同源（`components/landing/bouncy-accordion.tsx`）；卡片 / 面板 / 导航容器等无对应 registry 组件的表面仍是自绘「Premium」层（`components/landing/` + globals.css 的 `@layer components`）。**`/docs` 文档区用 fumadocs-ui**（侧栏 / 搜索 / TOC / Tabs / CodeBlock 等）——两区共用同一套黑白 Design Tokens（globals.css 的 `--color-fd-*` 覆盖段把 fumadocs 基底对齐到站点体系，视觉不割裂）
- beUI 覆盖不到的地方仍是自绘：registry 124 项里**没有通用进度条与 Card**，首页「功能对齐 29/29」那根进度条与卡片表面即属此类；`components/theme-toggle.tsx` 也暂未换 beUI 的 `theme-toggle`（换它要重接 `theme-switch-animation` 的 ref 转发，已登记暂缓）
- 内容：`content/**` 手写 MDX，**独立维护、与仓库 `docs/` 不同步**——`docs/` 口径变化时需人工回写本站
- 搜索：构建期预渲染索引（`app/api/search` force-static + RootProvider `type:'static'`），纯静态可用
- `/docs` 侧栏底部操作条：GitHub + 四端演示站外链（`DocsLayout` 的 `links` icon 型链接，绝对 URL 由 fumadocs 的 `Link` 自动带 `target="_blank"`；地址收口在 `lib/site.ts` 的 `DEMOS`，图标复用 `components/icons/stack-icons.tsx`）
- 图标 / OG：stack 图标由 `scripts/gen-stack-icons.mjs` 从 Simple Icons 生成并提交仓库；og 图片为黑白风格构建期生成

## 常用命令

```bash
pnpm dev      # 开发（with-memory-cap 控制堆内存）
pnpm build    # 静态导出构建（out/，全部路由 force-static 预渲染）
pnpm start    # 本地预览构建产物
```

## 部署

Cloudflare Workers（静态导出）：`wrangler.jsonc` 指向 `out/`，Worker 名 `better-admin`。构建不访问外网；环境变量无服务端密钥。
