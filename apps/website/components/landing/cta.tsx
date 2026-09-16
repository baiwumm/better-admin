import Link from "next/link";

export function Cta() {
  return (
    <section className="px-6 py-24">
      <div className="panel-premium mx-auto max-w-5xl px-10 py-16 text-center sm:px-16">
        <h2 className="text-balance text-3xl font-bold tracking-tight">
          准备好深入了吗？
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-muted-foreground">
          从概览开始，了解 Better Admin
          的架构约定、数据库设计与多技术栈实现细节。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/start/quick-start"
            className="btn-solid px-6 py-2.5 text-sm font-bold"
          >
            从快速开始读起
          </Link>
          <Link
            href="/docs/architecture/database"
            className="btn-outline px-6 py-2.5 text-sm font-bold text-foreground"
          >
            看数据库设计
          </Link>
        </div>
      </div>
    </section>
  );
}
