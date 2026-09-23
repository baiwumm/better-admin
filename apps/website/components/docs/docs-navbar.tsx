"use client";

import { Menu, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchDialog, useSearchHotkey } from "@/components/docs/search-dialog";
import { SITE } from "@/lib/site";
import { useState } from "react";

/**
 * 文档区顶栏（beUI 风格：毛玻璃 sticky 长条，区别于首页的悬浮胶囊）
 */
export function DocsNavbar({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchHotkey(() => setSearchOpen(true));

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 lg:px-6">
          <button
            type="button"
            aria-label="展开侧边栏"
            onClick={onOpenSidebar}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground lg:hidden"
          >
            <Menu size={17} />
          </button>

          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo size={22} className="rounded-md" />
            <span className="hidden sm:inline">Better Admin</span>
          </Link>

          <nav className="ms-4 hidden items-center gap-1 md:flex">
            <Link
              href="/docs"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              文档
            </Link>
          </nav>

          <div className="flex-1" />

          {/* 搜索按钮（⌘K） */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-[13px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
          >
            <SearchIcon size={14} />
            <span className="hidden sm:inline">搜索文档…</span>
            <kbd className="hidden rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 仓库"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <GitHubIcon />
          </a>

          <ThemeToggle />
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
