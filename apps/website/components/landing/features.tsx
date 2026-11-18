import { Typography } from "@heroui/react";
import {
  Boxes,
  Database,
  FileJson,
  GitBranch,
  KeyRound,
  Layers,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { SectionHeader } from "@/components/landing/section-header";

const FEATURES = [
  {
    icon: Layers,
    title: "多技术栈同构",
    body: "同一套产品与业务逻辑，五端各完整落地一遍，用来横向对照多栈工程实践。",
  },
  {
    icon: FileJson,
    title: "OpenAPI 契约优先",
    body: "先定义 Contract 再实现，路径、响应信封、错误码、分页参数逐字一致。",
  },
  {
    icon: ShieldCheck,
    title: "RBAC 权限位掩码",
    body: "用户 ↔ 角色 ↔ 权限，10 个权限点各占一个二进制位；服务端强制校验。",
  },
  {
    icon: Database,
    title: "一个数据库",
    body: "五端共用同一个 Supabase PostgreSQL，Schema、业务规则与数据类型不分叉。",
  },
  {
    icon: GitBranch,
    title: "Drizzle 统一 ORM",
    body: "迁移只在 Nest 端发起，其余各端读同一份 Schema，不各自造模型。",
  },
  {
    icon: KeyRound,
    title: "JWT 双 Token 会话",
    body: "认证由应用自身实现，不依赖 Supabase Auth；刷新与吊销五端行为一致。",
  },
  {
    icon: Boxes,
    title: "独立部署，零耦合",
    body: "不引入 workspace 提升，每个应用各持 lockfile，可单独构建与上线。",
  },
  {
    icon: Server,
    title: "UI 基准单一",
    body: "React 是 UI Source of Truth；Vue 与 Nuxt 用 Nuxt UI v4 对齐功能与交互。",
  },
  {
    icon: Terminal,
    title: "文档与实现同仓",
    body: "需求、机制、进度与契约设计都在仓库内维护，口径不靠口口相传。",
  },
];

export function Features() {
  return (
    <section className="border-t border-border" id="features">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="04 / 约定"
          sub="不允许因为实现方便而破坏架构约定，所有技术栈遵循同一份规范。"
          title="九条不可动摇的约定"
        />

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-2.5 bg-background px-6 py-7"
            >
              <feature.icon
                aria-hidden
                className="size-5 text-accent"
                size={20}
                strokeWidth={1.6}
              />
              <Typography type="body-sm" weight="medium">
                {feature.title}
              </Typography>
              <Typography color="muted" type="body-xs">
                {feature.body}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
