# Better Admin — NestJS API

Better Admin 的 **NestJS 后端 API**：为 React / Vue 前端提供 REST API，是 **API Contract 与数据库迁移的真源**。

- 在线地址：<https://nest.baiwumm.com>（Render，`/api/health` 由 UptimeRobot 每 5 分钟探活保活）
- API 文档（Swagger）：<https://nest.baiwumm.com/docs>（本地启动后 `/docs`）
- Contract 真源：[`openapi/openapi.yaml`](./openapi/openapi.yaml)（当前 v1.14.0；**先定 Contract 再实现**，四端共用）
- 数据库：PostgreSQL（Supabase 托管）+ Drizzle ORM 0.45；**迁移真源在 [`drizzle/`](./drizzle)**——Next / Nuxt 端直连同库但不生成 / 不执行迁移
- 鉴权：JWT 双令牌（Bearer）；权限模型 RBAC（用户 ↔ 角色 ↔ 权限位掩码 + 菜单授权，`super_admin` 全量位实时 OR 聚合）

## 常用命令

```bash
pnpm start:dev      # 开发（watch）
pnpm build          # 构建
pnpm lint           # ESLint
pnpm db:generate    # drizzle-kit 生成迁移
pnpm db:migrate     # 执行迁移（scripts/migrate.ts）
pnpm db:seed        # 初始化数据（菜单 / 角色 / 演示数据；新库引导 = migrate + seed）
pnpm db:demo-reset  # 演示数据重置（faker，幂等）
pnpm storage:init   # Supabase Storage avatars bucket 初始化（幂等）
```

> `scripts/migrate-menus-add-playground*.ts` 四个脚本保留：Playground 菜单树未并入 seed，新库引导需按脚本头注释执行一次。

## 环境变量

见 [`.env.example`](./.env.example)：`DATABASE_URL`（本地 5432 / Supabase pooler 6543）、`JWT_SECRET` / `JWT_REFRESH_SECRET`（缺失即启动抛错，无兜底）、`SEED_ADMIN_PASSWORD`、`LOG_*`（API 日志与进程内 `@Cron` 日志清理）、`DEMO_MODE=true`（只读演示守卫 + `POST /auth/demo-login` 快捷登录）、`SUPABASE_URL` / `SUPABASE_SECRET_KEY`（服务端持有，仅 `sb_secret_` 密钥走 `apikey` 头）。**严禁提交真实密钥。**

## 部署

Render（Root Directory 指向 `nest/`）：`pnpm build` + `node dist/main.js`，CORS 白名单含四端域名。日志 / 刷新令牌清理由进程内 `@Cron` 承担（`LOG_CLEANUP_CRON`）。
