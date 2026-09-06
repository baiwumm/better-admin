"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE } from "@/lib/site";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="w-full max-w-2xl rounded-2xl border border-black/10 bg-background/70 px-4 py-2 shadow-lg backdrop-blur-xl dark:border-white/10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Logo size={24} className="rounded-md" />
            Better Admin
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/docs"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              文档
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <ThemeToggle />
            <Link
              href="/docs"
              className="ml-1 rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background transition-opacity hover:opacity-80"
            >
              开始阅读
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label="展开导航"
              onClick={() => setOpen(!open)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>

        {open ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-dashed pt-2 sm:hidden">
            <Link
              href="/docs"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              文档
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
