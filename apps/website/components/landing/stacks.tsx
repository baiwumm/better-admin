import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { ButtonLink } from "@/components/motion/button/base";
import { type StackKey, StackGlyph } from "@/components/icons/stack-icons";

/** 六端已于 2026-09-23 统一上线（AGENTS.md §17），五个应用状态一致；url / actionLabel 即各端卡片按钮 */
const STACKS: {
  name: string;
  /** 卡片头部的技术栈图标 */
  icon: StackKey;
  role: string;
  status: string;
  url: string;
  actionLabel: string;
}[] = [
  {
    name: "React 19",
    icon: "react",
    role: "UI Source of Truth，Hero UI 模板实现",
    status: "已上线",
    url: "https://react.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "Next.js 16",
    icon: "nextjs",
    role: "独立全栈实现，不依赖 NestJS",
    status: "已上线",
    url: "https://next.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "NestJS + Drizzle",
    icon: "nestjs",
    role: "REST API，PostgreSQL 统一数据库",
    status: "已上线",
    // 接口文档（Scalar UI）：main.ts 的 SwaggerModule.setup('docs')，无全局 api 前缀
    url: "https://nest.baiwumm.com/docs",
    actionLabel: "接口文档",
  },
  {
    name: "Vue 3 + Nuxt UI",
    icon: "vue",
    role: "复刻 React 版本的页面与交互",
    status: "已上线",
    url: "https://vue.baiwumm.com",
    actionLabel: "在线演示",
  },
  {
    name: "Nuxt",
    icon: "nuxt",
    role: "独立全栈实现，不依赖 NestJS",
    status: "已上线",
    url: "https://nuxt.baiwumm.com",
    actionLabel: "在线演示",
  },
];

export function Stacks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <AnimatedBadge size="sm" className="mb-5">
            Stacks
          </AnimatedBadge>
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            技术栈与进度
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            每个应用独立运行、独立构建、独立部署，共用同一个 PostgreSQL 数据库。
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STACKS.map((stack) => (
            <div
              key={stack.name}
              className="card-premium flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="icon-tile-sm">
                      <StackGlyph stack={stack.icon} className="size-5" />
                    </span>
                    <h3 className="font-semibold">{stack.name}</h3>
                  </div>
                  <AnimatedBadge status="success" size="sm">
                    {stack.status}
                  </AnimatedBadge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {stack.role}
                </p>
              </div>
              {/* 各端线上站点入口（用户拍板：链接从页脚移到卡片内）；NestJS 卡指向接口文档 */}
              <ButtonLink
                href={stack.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                size="sm"
                className="mt-4 self-start"
              >
                <ArrowUpRight size={14} />
                {stack.actionLabel}
              </ButtonLink>
            </div>
          ))}

          {/* 功能对齐状态卡：用进度条把「29 / 29」变成可看的东西，
              高度刻意压到与相邻卡片齐平，避免撑出成片空白 */}
          <div className="card-premium flex flex-col p-6">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">功能对齐状态</h3>
              <span className="font-mono text-xs text-muted-foreground">
                29 / 29
              </span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]">
              {/* beUI registry（124 项）无通用进度条，此处保留自绘：填充用纵向渐变 + 顶高光 + 底内描边 */}
              <div
                className="h-full rounded-full bg-gradient-to-b from-foreground/90 to-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-1px_0_rgb(0_0_0/0.12)] transition-[width] duration-700 ease-out"
                style={{ width: "100%" }}
              />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                四端功能已全部对齐
              </p>
              {/* 查看入口收敛为一个图标（用户拍板）：完整矩阵见功能矩阵页 */}
              <Link
                href="/docs/progress/feature-matrix"
                aria-label="查看功能矩阵"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
