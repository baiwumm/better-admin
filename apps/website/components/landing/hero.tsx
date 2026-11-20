"use client";

import { Button, Typography } from "@heroui/react";
import NumberFlow from "@number-flow/react";
import { ArrowRight, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SpecSheet } from "@/components/landing/spec-sheet";
import { GithubIcon } from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";

const STATS: { label: string; total?: number; value: number }[] = [
  { label: "应用", value: 5 },
  { label: "功能对齐", value: 29, total: 29 },
  { label: "权限位", value: 10 },
  { label: "数据库", value: 1 },
];

/**
 * 首屏数值：挂载后从 0 计数到目标值。
 * NumberFlow 只在数值变化时动画，所以先渲染 0 再推进；
 * 「29/29」这类分数只给左边的分子做动画，分母保持静态文本。
 */
function StatValue({ total, value }: { total?: number; value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplay(value));

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <NumberFlow value={display} />
      {total === undefined ? null : <span>/{total}</span>}
    </>
  );
}

/** 首个演示入口固定为 React 版（UI Source of Truth） */
const DEMO_URL = "https://react.baiwumm.com";

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden">
      {/* 朱红氛围光：低占比 radial，只铺首屏右上方 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(760px circle at 80% 22%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-14 sm:pt-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Typography
              className="eyebrow reveal"
              type="body-xs"
              weight="semibold"
            >
              开源 · 五端同构 · MIT
            </Typography>

            <Typography
              className="reveal max-w-xl text-balance text-4xl leading-[1.12] tracking-tight sm:text-5xl"
              style={{ animationDelay: "80ms" }}
              type="h1"
              weight="semibold"
            >
              一套 Admin 系统
              <br />
              五种技术栈实现
            </Typography>

            <Typography
              className="reveal max-w-xl text-pretty leading-relaxed"
              color="muted"
              style={{ animationDelay: "160ms" }}
              type="body-sm"
            >
              同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用
              React、Vue、Next.js、Nuxt 与 NestJS 独立实现、独立部署。
            </Typography>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: "240ms" }}
                variant="primary"
                onPress={() => router.push("/docs/start/quick-start/")}
              >
                <BookOpen className="size-4" />
                快速开始
              </Button>
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: "320ms" }}
                variant="outline"
                onPress={() =>
                  window.open(DEMO_URL, "_blank", "noopener,noreferrer")
                }
              >
                在线演示
                <ArrowRight className="size-4" />
              </Button>
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: "400ms" }}
                variant="tertiary"
                onPress={() =>
                  window.open(SITE.github, "_blank", "noopener,noreferrer")
                }
              >
                <GithubIcon className="size-4" />
                GitHub
              </Button>
            </div>
          </div>

          <div
            className="reveal min-w-0 flex-1"
            style={{ animationDelay: "400ms" }}
          >
            <SpecSheet />
          </div>
        </div>

        {/* 数据行：hairline 分隔，等宽数字，不做卡片 */}
        <dl
          className="reveal mt-14 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4"
          style={{ animationDelay: "480ms" }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-1">
              <dt>
                <Typography color="muted" type="body-xs">
                  {stat.label}
                </Typography>
              </dt>
              <dd className="font-mono text-3xl tabular-nums sm:text-4xl">
                <StatValue total={stat.total} value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
