import { Typography } from "@heroui/react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { type StackKey, StackGlyph } from "@/components/icons/stack-icons";
import { SectionHeader } from "@/components/landing/section-header";

/** 六端已于 2026-09-23 统一上线（AGENTS.md §17），五个应用状态一致 */
const STACKS: {
  name: string;
  icon: StackKey;
  role: string;
  stack: string;
  url: string;
  actionLabel: string;
}[] = [
  {
    name: "React",
    icon: "react",
    role: "UI Source of Truth，Hero UI 模板实现",
    stack: "React 19 · Vite · Hero UI",
    url: "https://react.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "Vue",
    icon: "vue",
    role: "按 React 版复刻页面与交互",
    stack: "Vue 3 · Nuxt UI v4",
    url: "https://vue.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "Next.js",
    icon: "nextjs",
    role: "独立全栈，不依赖 NestJS",
    stack: "Next 16 · 直连 PostgreSQL",
    url: "https://next.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "Nuxt",
    icon: "nuxt",
    role: "独立全栈，不依赖 NestJS",
    stack: "Nuxt 4 · Nuxt UI v4",
    url: "https://nuxt.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "NestJS",
    icon: "nestjs",
    role: "REST API，只服务 React / Vue",
    stack: "NestJS · Drizzle ORM",
    // 接口文档（Scalar UI）：main.ts 的 SwaggerModule.setup('docs')，无全局 api 前缀
    url: "https://nest.baiwumm.com/docs",
    actionLabel: "接口文档",
  },
];

export function Stacks() {
  return (
    <section className="border-t border-border" id="stacks">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="03 / 五端"
          sub="每个应用独立运行、独立构建、独立部署，共用同一个 PostgreSQL 数据库。"
          title="技术栈与线上入口"
        />

        <div className="mt-10 overflow-hidden rounded-lg border border-border">
          {STACKS.map((item, index) => (
            <a
              key={item.name}
              className="group flex flex-col gap-3 border-t border-border px-5 py-5 transition-colors first:border-t-0 hover:bg-default/60 sm:flex-row sm:items-center sm:gap-5"
              href={item.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="hidden font-mono text-[11px] text-muted sm:block sm:w-7">
                {String(index + 1).padStart(2, "0")}
              </span>

              <StackGlyph className="size-5 shrink-0" stack={item.icon} />

              <div className="min-w-0 flex-1">
                <Typography type="body-sm" weight="medium">
                  {item.name}
                </Typography>
                <Typography color="muted" type="body-xs">
                  {item.role}
                </Typography>
              </div>

              <Typography
                className="shrink-0 whitespace-nowrap font-mono"
                color="muted"
                type="body-xs"
              >
                {item.stack}
              </Typography>

              <span className="flex shrink-0 items-center gap-4 whitespace-nowrap sm:justify-end">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-accent"
                  />
                  <Typography
                    className="whitespace-nowrap"
                    color="muted"
                    type="body-xs"
                  >
                    已上线
                  </Typography>
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-foreground">
                  {item.actionLabel}
                  <ArrowUpRight
                    className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    size={14}
                  />
                </span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-baseline gap-2">
              <span className="font-mono text-lg tabular-nums">29 / 29</span>
              <Typography color="muted" type="body-xs">
                四端功能已全部对齐
              </Typography>
            </p>
            <Link
              className="inline-flex items-center gap-1 text-xs text-accent"
              href="/docs/progress/feature-matrix/"
            >
              查看功能矩阵
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-default">
            <div className="h-full w-full rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}
