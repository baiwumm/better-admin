"use client";

import type { ReactNode } from "react";

import { Button, Tooltip, Typography } from "@heroui/react";
import { BookOpen, ChartLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/ui/brand-icons";
import { SITE } from "@/lib/site";

const DEMO_URL = "https://react.baiwumm.com";

/** 顶栏图标按钮共用的箭头提示（与参考站同款交互） */
function NavTooltip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tooltip delay={0}>
      {children}
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <Typography type="body-xs">{label}</Typography>
      </Tooltip.Content>
    </Tooltip>
  );
}

/**
 * 顶部导航（2026-11-18）：贴顶 hairline 条 + HeroUI 图标按钮。
 * 左：Logo + 站名；右：文档 / 在线演示 / GitHub 三个图标入口 + 主题切换。
 */
export function Navbar() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-6">
        <Link className="flex min-w-0 items-center gap-2.5" href="/">
          <Logo className="shrink-0 rounded-lg" size={28} />
          <Typography
            className="truncate leading-tight"
            type="h6"
            weight="semibold"
          >
            Better Admin
          </Typography>
        </Link>

        <nav aria-label="主导航" className="ml-auto flex items-center gap-2">
          <NavTooltip label="文档">
            <Button
              isIconOnly
              aria-label="文档"
              size="sm"
              variant="outline"
              onPress={() => router.push("/docs/")}
            >
              <BookOpen className="size-4" />
            </Button>
          </NavTooltip>
          <NavTooltip label="在线演示">
            <Button
              isIconOnly
              aria-label="在线演示"
              size="sm"
              variant="outline"
              onPress={() =>
                window.open(DEMO_URL, "_blank", "noopener,noreferrer")
              }
            >
              <ChartLine className="size-4" />
            </Button>
          </NavTooltip>
          <NavTooltip label="GitHub">
            <Button
              isIconOnly
              aria-label="GitHub"
              size="sm"
              variant="outline"
              onPress={() =>
                window.open(SITE.github, "_blank", "noopener,noreferrer")
              }
            >
              <GithubIcon className="size-4" />
            </Button>
          </NavTooltip>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
