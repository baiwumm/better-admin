const STACKS = [
  {
    name: "React 19",
    role: "UI Source of Truth，Hero UI 模板实现",
    status: "已完成",
    active: true,
  },
  {
    name: "Next.js 16",
    role: "独立全栈实现，不依赖 NestJS",
    status: "已上线",
    active: true,
  },
  {
    name: "NestJS + Drizzle",
    role: "REST API，PostgreSQL 统一数据库",
    status: "已上线",
    active: true,
  },
  {
    name: "Vue 3 + Nuxt UI",
    role: "复刻 React 版本的页面与交互",
    status: "进行中",
    active: false,
  },
  {
    name: "Nuxt",
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
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            技术栈与进度
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            每个应用独立运行、独立构建、独立部署，共用同一个 PostgreSQL 数据库。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACKS.map((stack) => (
            <div
              key={stack.name}
              className="flex flex-col justify-between rounded-2xl border border-dashed p-6 shadow-none transition-colors hover:bg-muted/50"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{stack.name}</h3>
                  <span
                    className={
                      stack.active
                        ? "rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-bold text-background"
                        : "rounded-full border border-dashed px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    }
                  >
                    {stack.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {stack.role}
                </p>
              </div>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm font-semibold">查看完整对齐状态</p>
            <a
              href="/docs/progress/feature-matrix"
              className="mx-auto mt-2 w-fit rounded-full border border-dashed px-4 py-1 text-xs font-bold transition-colors hover:bg-muted"
            >
              功能矩阵
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
