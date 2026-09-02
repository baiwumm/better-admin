# Better Admin — Next.js 全栈版

同一套 Better Admin 产品（见仓库根 [AGENTS.md](../AGENTS.md)）的 **Next.js 独立全栈实现**：
App Router + Server Components/Route Handlers + PostgreSQL（Drizzle ORM），不依赖 NestJS。

- UI 基准：以 `/react`（HeroUI v3）为 Source of Truth，页面结构/交互/视觉对齐
- API：`src/app/api/**` Route Handlers，形状对齐冻结契约 `contracts/openapi.v1.6.0.frozen.yaml`
- 鉴权：JWT 双令牌（httpOnly Cookie）+ `src/proxy.ts` 守卫（验签 + token_version 实时比对 + 菜单路径 403/404 语义）
- 数据库：与 Nest 端共用同一 Supabase PostgreSQL；**迁移真源在 `nest/drizzle/`**，本端不生成/不执行迁移

## 已实现模块（N0–N7）

认证（登录/双令牌/静默轮换/强制下线）· Admin 布局（动态菜单/多标签页/命令面板/主题语言切换）·
用户管理 · 角色管理（含菜单授权抽屉）· 菜单管理 · 权限说明页 · 字典管理 · 日志管理 ·
我的账户（Supabase Storage 头像）· 组织管理（组织树/拖拽排序）· 错误页 403/404/500

## 常用命令

```bash
pnpm dev            # 开发（默认 3000）
pnpm build / start  # 生产构建 / 启动
pnpm lint           # ESLint（--fix）
pnpm db:pull        # 从数据库内省生成 src/db/schema.ts（Nest 端迁移变更后手动执行）
pnpm db:clean-logs  # 日志清理（保留 LOG_RETENTION_DAYS 天，默认 30；供 GitHub Actions cron 调用）
pnpm check-locales  # 语言包与 react/src/i18n/locales 一致性检查（CI 强制）
```

## 环境变量

见 [.env.example](./.env.example)：`DATABASE_URL`、`JWT_*`、`SUPABASE_URL/SUPABASE_SECRET_KEY`、
`LOG_RETENTION_DAYS`、`NEXT_PUBLIC_*`。密钥仅存在于服务端环境变量，严禁提交。

## 部署（Vercel）

- Root Directory 指向 `next/`，环境变量在 Vercel 项目配置（同名于 .env.example）
- 数据库迁移**不**在 Vercel 执行（真源在 Nest 端）；`db:pull` 仅本地开发使用
- 日志清理：GitHub Actions cron 调用 `db:clean-logs`（workflow 挂接见仓库级 CI 安排），
  需在 GitHub Secrets 配置 `DATABASE_URL`；与 Nest 端 schedule 重复执行无害（幂等）

## 已知差异（相对 React 版，均为已确认决策）

- KeepAlive 放弃（App Router 无等价机制）；标签「刷新」仅对当前激活标签生效
- 令牌存储层为 httpOnly Cookie（React 为 localStorage + Bearer）；API 内部仍兼容 Bearer 解析
- 菜单权限过滤在服务端完成（React 在客户端）；日志清理载体为 GitHub Actions cron（Nest 为进程内 schedule）
- 冻结契约快照之外的契约内容（组织阶段 2 的岗位/通讯录、公告模块）待 Nest/React 端落地后跟进
