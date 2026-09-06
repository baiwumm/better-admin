import Link from "next/link";
import { SITE } from "@/lib/site";

/** 仿 Admin 界面的黑白骨架窗口（纯 CSS，ogimg 式的产品视觉锚点） */
function AdminMockup() {
  return (
    <div
      className="animate-fade-up-delay-4 mx-auto mt-20 max-w-4xl"
      style={{ transform: "perspective(1400px) rotateX(8deg)" }}
    >
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-card shadow-2xl dark:border-white/10">
        <div className="flex items-center gap-2 border-b border-dashed px-4 py-3">
          <span className="size-2.5 rounded-full border border-black/20 dark:border-white/20" />
          <span className="size-2.5 rounded-full border border-black/20 dark:border-white/20" />
          <span className="size-2.5 rounded-full border border-black/20 dark:border-white/20" />
          <span className="ml-3 h-4 flex-1 rounded-full bg-muted" />
        </div>
        <div className="flex">
          <div className="hidden w-44 flex-col gap-3 border-r border-dashed p-4 sm:flex">
            <div className="h-2 w-20 rounded bg-foreground/70" />
            {[24, 32, 28, 36, 26, 30].map((width, i) => (
              <div
                key={i}
                className="h-2 rounded bg-muted"
                style={{ width: `${width * 2}px` }}
              />
            ))}
          </div>
          <div className="flex-1 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-2.5 w-24 rounded bg-foreground/70" />
              <div className="h-5 w-16 rounded-full border border-dashed" />
            </div>
            <div className="border-y border-dashed py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5"
                  style={{ opacity: 1 - i * 0.13 }}
                >
                  <span className="size-3.5 rounded-full border border-black/15 dark:border-white/15" />
                  <span className="h-2 flex-1 rounded bg-muted" />
                  <span className="h-2 w-12 rounded bg-muted" />
                  <span className="h-2 w-8 rounded bg-foreground/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-24 text-center">
      <div className="animate-fade-up mx-auto mb-6 w-fit rounded-full border border-dashed px-4 py-1 text-xs font-medium text-muted-foreground">
        同一套产品 · 五种技术栈实现
      </div>
      <h1 className="animate-fade-up-delay-1 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
        一套 Admin 系统
        <br />
        五种技术栈实现
      </h1>
      <p className="animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用
        React、Vue、Next.js、Nuxt 与 NestJS 独立实现。
      </p>
      <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/docs"
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-80"
        >
          阅读文档
        </Link>
        <a
          href={SITE.github}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-dashed px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          GitHub
        </a>
      </div>
      <AdminMockup />
    </section>
  );
}
