import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

/**
 * Drizzle 数据库客户端（Nuxt 端，逐字平移自 next/src/db/client.ts，仅移除
 * "server-only" 导入——Nitro server/ 目录本身即服务端边界）。
 *
 * 连接信息只允许存在于服务端环境变量 DATABASE_URL，严禁写入前端或提交仓库。
 * 连接池端口 6543（Supabase transaction pooler），URL 中禁止携带 sslmode 参数。
 *
 * SSL：Supabase（及多数云托管 PG）要求 TLS。postgres.js 对 URL 中的
 * sslmode=require 会走证书链校验（自签/私有 CA 会失败），因此统一在代码层
 * 配置 ssl: { rejectUnauthorized: false }，与 Nest 端（pg 驱动）行为一致。
 *
 * prepare: false：transaction pooler 不支持预编译语句复用，必须禁用。
 *
 * 池防护四项与 next/src/db/client.ts 完全对齐（平移时曾漏掉，见 docs/progress.md
 * 「stats 接口持续挂起根因」条目）：事务池模式（6543）下空闲连接被池端回收后，
 * 复用半开连接的查询永不返回且不发错误，stats 概览的 14 并发查询会把故障率放大到
 * 几乎必挂。postgres.js 这几个参数单位均为秒。
 */
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL 环境变量未设置，无法初始化数据库连接。')
}

export const sql = postgres(connectionString, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 30,
  keep_alive: 30,
  max_lifetime: 60 * 30,
  connect_timeout: 10
})

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV !== 'production'
})
