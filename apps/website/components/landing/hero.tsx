import { ArrowRight, BookOpen } from "lucide-react";
import { GithubIcon } from "@/components/ui/brand-icons";
import { ButtonLink } from "@/components/motion/button/base";
import { PromoVideo } from "@/components/landing/promo-video";
import { SITE } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-24 text-center">
      {/* 极淡点阵材质，只在主视觉背后可见 */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60"
      />
      <div className="relative">
        <a
          href={SITE.github}
          target="_blank"
          rel="noreferrer"
          className="animate-fade-up group mx-auto mb-6 flex w-fit items-center gap-3 rounded-full border bg-background/80 p-1 ps-4 text-xs font-medium text-muted-foreground shadow-md backdrop-blur transition-colors duration-300 hover:bg-muted hover:text-foreground"
        >
          <span>同一套产品 · 五种技术栈实现</span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          {/* 箭头循环滑入：两支箭头错开一个圆宽，悬停时整体右移，视觉上无限推进 */}
          <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-muted transition-colors group-hover:bg-background">
            <ArrowRight className="absolute inset-0 m-auto size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-6" />
            <ArrowRight className="absolute inset-0 m-auto size-3.5 -translate-x-6 transition-transform duration-300 ease-out group-hover:translate-x-0" />
          </span>
        </a>
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
          <ButtonLink href="/docs">
            <BookOpen size={16} />
            阅读文档
          </ButtonLink>
          <ButtonLink
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
          >
            <GithubIcon className="size-4" />
            GitHub
          </ButtonLink>
        </div>
        <PromoVideo />
      </div>
    </section>
  );
}
