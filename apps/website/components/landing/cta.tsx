import Link from "next/link";

export function Cta() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl rounded-3xl border border-dashed p-10 text-center sm:p-16">
        <h2 className="text-balance text-3xl font-bold tracking-tight">
          准备好深入了吗？
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-muted-foreground">
          从需求总览开始，了解 Better Admin
          的架构约定、数据库设计与多技术栈实现细节。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/guide/requirements"
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-80"
          >
            从需求总览开始
          </Link>
          <Link
            href="/docs/progress/log"
            className="rounded-full border border-dashed px-6 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
          >
            查看进度记录
          </Link>
        </div>
      </div>
    </section>
  );
}
