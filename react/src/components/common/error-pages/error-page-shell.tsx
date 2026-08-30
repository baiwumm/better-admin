import type { ReactNode } from "react";

import { Button, Typography, cn } from "@heroui/react";
import { Link, useRouter } from "@tanstack/react-router";

import { ErrorPageGlyph } from "./error-page-glyph";

import { useTranslation } from "@/i18n";

/** 错误页情绪色调：403 拒绝（danger）/ 404 迷路（primary）/ 500 故障（warning） */
export type ErrorPageTone = "danger" | "primary" | "warning";

const TONE_STYLES: Record<
  ErrorPageTone,
  {
    /** 柔和大圆光晕 */
    glow: string;
    /** 圆环 / 三角几何光斑描边与填充 */
    ring: string;
    triangle: string;
    /** 毛玻璃卡片 1px 渐变描边（透明 → tone 色） */
    border: string;
    badge: string;
    /** 线稿插画颜色 */
    glyph: string;
    strokeVar: string;
  }
> = {
  primary: {
    glow: "bg-accent/25",
    ring: "border-accent/20",
    triangle: "bg-accent/10",
    border: "from-transparent to-accent/45",
    badge: "bg-accent/15 text-accent",
    glyph: "text-accent",
    strokeVar: "var(--accent)",
  },
  danger: {
    glow: "bg-danger/25",
    ring: "border-danger/20",
    triangle: "bg-danger/10",
    border: "from-transparent to-danger/45",
    badge: "bg-danger/15 text-danger",
    glyph: "text-danger",
    strokeVar: "var(--danger)",
  },
  warning: {
    glow: "bg-warning/30",
    ring: "border-warning/25",
    triangle: "bg-warning/15",
    border: "from-transparent to-warning/50",
    badge: "bg-warning/20 text-warning",
    glyph: "text-warning",
    strokeVar: "var(--warning)",
  },
};

type ErrorPageShellProps = {
  /** 状态码，如 "404"（同时用作背景描边巨字与线稿插画映射） */
  status: string;
  /** 情绪色调：驱动光斑 / 图标章 / 巨字描边 / 卡片渐变描边颜色 */
  tone: ErrorPageTone;
  title: string;
  description: string;
  icon: ReactNode;
  /** 自定义操作区；缺省为「返回上一页 + 返回首页」双按钮 */
  actions?: ReactNode;
};

/**
 * 全屏错误页通用壳（毛玻璃卡片 + 巨字光晕）：
 * - 背景层（z-0）：描边空心状态码巨字 + tone 色线稿插画 + 几何光斑（圆 / 圆环 / 三角）+ 点阵；
 * - 前景层（z-1）：毛玻璃卡片承载图标章 / 标题 / 描述 / 操作区，
 *   1px 渐变描边（透明 → tone 色），巨字穿透卡片若隐若现；
 * - 入场动画经 .error-page-enter、按钮流光经 .btn-shine（globals.css，
 *   均尊重 prefers-reduced-motion）。
 */
export function ErrorPageShell({
  status,
  tone,
  title,
  description,
  icon,
  actions,
}: ErrorPageShellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = TONE_STYLES[tone];

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      {/* 氛围层（纯装饰）：几何光斑 × 3 + 中心渐隐点阵纹理 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className={cn(
            "absolute -top-48 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl",
            styles.glow,
          )}
        />
        <div
          className={cn(
            "absolute -bottom-16 left-[6%] size-72 rounded-full border-[28px] blur-2xl",
            styles.ring,
          )}
        />
        <div
          className={cn(
            "absolute right-[10%] top-[55%] size-80 blur-2xl [clip-path:polygon(50%_0,100%_100%,0_100%)]",
            styles.triangle,
          )}
        />
        <ErrorPageGlyph
          className={cn(
            "absolute right-[12%] top-1/2 hidden size-36 -translate-y-1/2 opacity-50 lg:block",
            styles.glyph,
          )}
          status={status}
        />
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_45%,black,transparent)]" />
      </div>

      {/* 巨字 + 毛玻璃卡片：巨字在流内、底部压进卡片顶边（负 margin 重叠），
          重叠区经半透明卡片 + backdrop-blur 呈现「穿透若隐若现」，且不受视口高度影响 */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <Typography
          aria-hidden
          className="-mb-6 select-none text-[5rem] font-bold leading-none tracking-tighter sm:-mb-8 sm:text-[7.5rem] lg:-mb-10 lg:text-[10rem]"
          style={{
            color: "transparent",
            WebkitTextStroke: `2px color-mix(in oklab, ${styles.strokeVar} 40%, transparent)`,
          }}
          type="h1"
        >
          {status}
        </Typography>
        <div
          className={cn(
            "w-full rounded-3xl bg-gradient-to-br p-px",
            styles.border,
          )}
        >
          <div className="error-page-enter flex flex-col items-center gap-4 rounded-[calc(1.5rem-1px)] bg-surface/80 px-8 py-10 text-center shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-surface/70 dark:shadow-black/20">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl",
                styles.badge,
              )}
            >
              {icon}
            </div>
            <Typography
              align="center"
              className="text-xl font-semibold"
              type="h2"
            >
              {title}
            </Typography>
            <Typography
              align="center"
              className="max-w-sm leading-normal"
              color="muted"
              type="body-sm"
            >
              {description}
            </Typography>
            <div className="mt-2 flex items-center gap-3">
              {actions ?? (
                <>
                  <Button
                    className="btn-shine"
                    variant="outline"
                    onPress={() => router.history.back()}
                  >
                    {t("common.goBack")}
                  </Button>
                  <Link to="/">
                    <Button className="btn-shine" variant="primary">
                      {t("common.backHome")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
