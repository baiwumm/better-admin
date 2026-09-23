"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button, ButtonLink } from "@/components/motion/button/base";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE } from "@/lib/site";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={`navbar-premium w-full max-w-2xl px-5 py-2 ${
          open ? "rounded-3xl" : "rounded-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Logo size={24} className="rounded-md" />
            Better Admin
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <ButtonLink href="/docs" variant="ghost" size="sm">
              文档
            </ButtonLink>
            <ButtonLink
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="sm"
            >
              GitHub
            </ButtonLink>
            <ThemeToggle />
            <ButtonLink href="/docs" size="sm" className="ms-1">
              开始阅读
            </ButtonLink>
          </div>

          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="展开导航"
              onClick={() => setOpen(!open)}
            >
              <Menu size={16} />
            </Button>
          </div>
        </div>

        {open ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-dashed pt-2 sm:hidden">
            <ButtonLink
              href="/docs"
              onClick={() => setOpen(false)}
              variant="ghost"
              size="sm"
              className="justify-start"
            >
              文档
            </ButtonLink>
            <ButtonLink
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="sm"
              className="justify-start"
            >
              GitHub
            </ButtonLink>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
