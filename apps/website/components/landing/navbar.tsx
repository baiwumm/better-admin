"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/motion/button/base";
import { GithubIcon } from "@/components/ui/brand-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE } from "@/lib/site";

/**
 * 顶部导航只保留 GitHub 与主题切换两个入口（用户拍板）：GitHub 用图标按钮、
 * 全视口通用（窄屏也放得下，不需要文字/图标双形态与汉堡折叠层）；
 * 文档入口由 Hero 的「阅读文档」主按钮与页脚承担。
 */
export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="navbar-premium w-full max-w-2xl rounded-full px-5 py-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Logo size={24} className="rounded-md" />
            Better Admin
          </Link>

          <div className="flex items-center gap-1">
            <ButtonLink
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="Better Admin on GitHub"
              variant="ghost"
              size="icon"
            >
              <GithubIcon className="size-[18px]" />
            </ButtonLink>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
