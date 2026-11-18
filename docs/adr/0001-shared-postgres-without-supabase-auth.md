# 共用一个 PostgreSQL，不使用 Supabase Auth

全部实现连接同一个 Supabase 托管的 PostgreSQL，ORM 统一为 Drizzle，迁移只从 NestJS 端发起。Supabase 只当数据库使用，认证、RBAC、Session 与 RLS 均不启用，改由应用自身实现——这样五端面对的是同一份 Schema、同一套业务规则和同一份契约，跨栈对照才有意义；代价是失去托管认证与行级安全，权限校验必须由服务端守卫逐端点承担。
