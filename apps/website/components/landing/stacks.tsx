import Link from "next/link";
import { type StackKey, StackGlyph } from "@/components/icons/stack-icons";

const STACKS: {
  name: string;
  /** 卡片头部的技术栈图标 */
  icon: StackKey;
  role: string;
  status: string;
  active: boolean;
}[] = [
  {
    name: "React 19",
    icon: "react",
    role: "UI Source of Truth，Hero UI 模板实现",
    status: "已完成",
    active: true,
  },
  {
    name: "Next.js 16",
    icon: "nextjs",
    role: "独立全栈实现，不依赖 NestJS",
    status: "已上线",
    active: true,
  },
  {
    name: "NestJS + Drizzle",
    icon: "nestjs",
    role: "REST API，PostgreSQL 统一数据库",
    status: "已上线",
    active: true,
  },
  {
    name: "Vue 3 + Nuxt UI",
    icon: "vue",
    role: "复刻 React 版本的页面与交互",
    status: "进行中",
    active: false,
  },
  {
    name: "Nuxt",
    icon: "nuxt",
    role: "独立全栈实现，不依赖 NestJS",
    status: "未启动",
    active: false,
  },
];

export function Stacks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="pill-badge mx-auto mb-5 w-fit rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Stacks
          </p>
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
                  {stack.active ? (
                    <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-bold text-background shadow-[inset_0_1px_0_rgb(255_255_255/0.24),0_1px_2px_rgb(0_0_0/0.18)]">
                      {stack.status}
                    </span>
                  ) : (
                    <span className="pill-badge rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {stack.status}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {stack.role}
                </p>
              </div>
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
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: "100%" }}
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              四端功能已全部对齐
            </p>
            <Link
              href="/docs/progress/feature-matrix"
              className="mt-auto pt-3 text-sm font-semibold text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              查看功能矩阵 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
