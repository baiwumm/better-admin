import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle 数据库客户端（Next 端）。
 *
 * 连接信息只允许存在于服务端环境变量 DATABASE_URL，严禁写入前端或提交仓库。
 * 连接串由环境提供（Supabase：6543 = transaction pooler，生产 serverless 用；
 * 5432 = session pooler，本地 dev 更稳），URL 中禁止携带 sslmode 参数。
 *
 * SSL：Supabase（及多数云托管 PG）要求 TLS。postgres.js 对 URL 中的
 * sslmode=require 会走证书链校验（自签/私有 CA 会失败），因此统一在代码层
 * 配置 ssl: { rejectUnauthorized: false }，与 Nest 端（pg 驱动）行为一致。
 *
 * prepare: false：transaction pooler 不支持预编译语句复用，必须禁用。
 *
 * PgBouncer/Supavisor 半开连接防护（对齐 Nest 端 98d7cad 的池四项防护，
 * 注意本驱动单位均为秒）：事务池模式下空闲连接被池端回收后，复用半开连接
 * 会让请求随机挂起/失败，stats 概览 14 并发查询会放大感知（本地实测 6543
 * 每轮并发后约 4/10 连接 wedged 且永不恢复）。故——idle_timeout 30s 主动
 * 收缩闲置连接（默认 null 永不收缩）、keep_alive 30s TCP 探活、max_lifetime
 * 30min 强制轮换长命连接、connect_timeout 10s 快速失败（默认 30）。
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 环境变量未设置，无法初始化数据库连接。");
}

export const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 30,
  keep_alive: 30,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
});

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});
