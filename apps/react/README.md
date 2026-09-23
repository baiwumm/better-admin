# Better Admin — React 版（UI Source of Truth）

Better Admin 的 **React 纯前端 SPA 实现**，也是整个产品的 **UI 基准版本**：页面结构、交互、视觉、Design Tokens 以本端为准（Vue / Next / Nuxt 对齐本端）。

- 在线地址：<https://react.baiwumm.com>（Cloudflare Workers Static Assets）
- 数据来源：全部经 **NestJS API**（本地开发需先启动 `apps/nest`，见 [`.env.example`](./.env.example) 的 `VITE_API_BASE_URL`），不直连数据库
- UI 组件：**Hero UI v3 + 项目级自定义组件** 两级（不含 Shadcn / Radix）；样式变量遵循项目级 Design Tokens（Hero UI 设计体系为参考）
- 核心依赖：React 19 · Vite 8 · TanStack Router（文件式路由）· TanStack Query · Zustand · Tailwind CSS 4 · TypeScript

## 功能范围

认证（登录 / 双令牌 / 静默轮换 / 强制下线）· Dashboard 概览 · 用户 / 角色 / 权限 / 菜单 / 字典 / 日志管理 · 我的账户（Supabase Storage 头像）· 组织中心（组织 / 岗位 / 通讯录 / 公告 / 站内信 / 架构图谱 / 导出）· 偏好设置 · 多标签页（KeepAlive）· 命令面板 · 全站国际化 · 路由过渡动画 · Playground 演示场。对齐状态见 [`docs/feature-matrix.md`](../../docs/feature-matrix.md)。

## 常用命令

```bash
pnpm dev            # 开发
pnpm build          # 生产构建（含类型检查）
pnpm preview        # 预览构建产物
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm check-locales  # 语言包一致性检查（CI 强制）
```

## 部署

Cloudflare Workers（Static Assets）：`wrangler.jsonc` 的 `assets.directory=./dist` + `not_found_handling=single-page-application` 负责 SPA 深链回退。环境变量仅需前端公开前缀 `VITE_*`。
