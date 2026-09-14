import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 本地开发从 .env.local 取 DATABASE_URL（不覆盖进程已有变量；
// Vercel 等部署平台注入的环境变量优先）
config({ path: ".env.local" });

/**
 * Drizzle Kit 配置（Next 端）。
 *
 * 架构约定（AGENTS §数据库 + 对齐方案 §架构要点 4）：
 * - 四端共用同一个 PostgreSQL（Supabase）；迁移真源在 nest/drizzle/，
 *   Next 端**不生成迁移、不跑迁移**；
 * - `pnpm db:pull`（drizzle-kit pull）从数据库内省生成 schema，经
 *   scripts/sync-pulled-schema.mjs 同步到 db/schema.ts（仓库唯一提交件）；
 *   drizzle-kit 会顺手生成迁移 SQL，落在 .drizzle-scratch/（gitignored），
 *   由同步脚本一并清除；
 * - Nest 端 schema 变更并执行迁移后，手动重新 pull。
 *
 * 已知坑（实测记录，后续 Nest 端换驱动/升 drizzle-kit 时注意复现条件）：
 * - drizzle-kit 0.31.10 在 postgres.js 驱动 + 多表并发内省下会因结果串扰
 *   崩溃（checkValue.replace of undefined），改用 pg 驱动（安装 pg 依赖即
 *   被 drizzle-kit 优先选用）后稳定；
 * - Supabase 附加了 auth/storage 等系统 schema，内省范围锁定 public；
 *   drizzle-kit pull 会忽略 drizzle.config 的 schemaFilter（本库实测），
 *   需以 --schemaFilters 参数兜底（db:pull 脚本已带）。
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./.drizzle-scratch",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
