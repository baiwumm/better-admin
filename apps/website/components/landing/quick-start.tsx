import { Typography } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/landing/section-header";

/**
 * 快速开始段：终端窗口 + 三步编号。
 * 命令取自 {docs}「快速开始」正文，端口 5173 是 React 端 Vite 的既定配置。
 */
const LINES: { kind: "comment" | "command" | "output"; text: string }[] = [
  { kind: "comment", text: "# 每个应用独立工程，在各自目录内安装" },
  { kind: "command", text: "cd apps/react" },
  { kind: "command", text: "pnpm install" },
  { kind: "command", text: "pnpm dev" },
  { kind: "output", text: "→ VITE ready · http://localhost:5173" },
  {
    kind: "comment",
    text: "# 其余四端同构：Nest 端先启 API，Next / Nuxt 直连数据库",
  },
];

const STEPS = [
  {
    title: "在应用目录内装依赖",
    body: "仓库不引入 workspace 依赖提升，每个应用各持一份 lockfile。",
  },
  {
    title: "按 .env.example 配环境变量",
    body: "数据库连接串与 JWT 密钥只存在于服务端，前端变量必须带公开前缀。",
  },
  {
    title: "由 Nest 端发起数据库迁移",
    body: "五端共用同一个 Supabase PostgreSQL，Schema 只有一份真源。",
  },
];

export function QuickStart() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="01 / 开始"
          sub="五个应用都能独立运行、独立构建、独立部署；本地对照只需要两个命令。"
          title="两个命令，把任一端跑起来"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="frame">
            <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
              <span
                aria-hidden
                className="size-2.5 rounded-full bg-danger/70"
              />
              <span
                aria-hidden
                className="size-2.5 rounded-full bg-accent/60"
              />
              <span
                aria-hidden
                className="size-2.5 rounded-full bg-success/60"
              />
              <Typography
                className="ms-3 font-mono"
                color="muted"
                type="body-xs"
              >
                terminal — better-admin
              </Typography>
            </div>

            <div className="flex flex-col gap-1.5 overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
              {LINES.map((line, index) => (
                <span
                  key={index}
                  className={
                    line.kind === "command" ? "text-foreground" : "text-muted"
                  }
                >
                  {line.kind === "command" ? (
                    <>
                      <span aria-hidden className="me-2 text-accent">
                        $
                      </span>
                      <span className="whitespace-pre">{line.text}</span>
                    </>
                  ) : (
                    <span className="whitespace-pre">{line.text}</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <ol className="flex flex-col justify-center gap-6">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-1.5 border-t border-border pt-5 first:border-t-0 first:pt-0"
              >
                <span className="font-mono text-[11px] font-semibold text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Typography type="body-sm" weight="medium">
                  {step.title}
                </Typography>
                <Typography color="muted" type="body-xs">
                  {step.body}
                </Typography>
              </li>
            ))}
            <li>
              <Link
                className="group inline-flex items-center gap-1.5 text-sm text-accent"
                href="/docs/start/quick-start/"
              >
                完整启动步骤
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  size={16}
                />
              </Link>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
