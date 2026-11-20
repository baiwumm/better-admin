import { Typography } from "@heroui/react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { GithubIcon } from "@/components/ui/brand-icons";
import { BEIAN, SITE } from "@/lib/site";

const POLICE_CODE = BEIAN.police.match(/\d+/)?.[0] ?? "";

const DOC_LINKS = [
  { label: "项目概览", href: "/docs/" },
  { label: "快速开始", href: "/docs/start/quick-start/" },
  { label: "仓库结构", href: "/docs/start/repo/" },
  { label: "API 架构", href: "/docs/architecture/api/" },
  { label: "数据库设计", href: "/docs/architecture/database/" },
  { label: "认证与权限", href: "/docs/architecture/auth/" },
];

const DEMO_LINKS = [
  { label: "React 版", href: "https://react.baiwumm.com" },
  { label: "Vue 版", href: "https://vue.baiwumm.com" },
  { label: "Next.js 版", href: "https://next.baiwumm.com" },
  { label: "Nuxt 版", href: "https://nuxt.baiwumm.com" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Logo className="rounded-lg" size={28} />
              <Typography type="body" weight="semibold">
                Better Admin
              </Typography>
            </div>
            <Typography
              className="max-w-sm leading-relaxed"
              color="muted"
              type="body-xs"
            >
              同一套 Admin 产品的多技术栈全栈实现。React 是本项目的 UI Source of
              Truth，Vue、Next.js、Nuxt 按基准复刻。
            </Typography>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
              href={SITE.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubIcon className="size-3.5" />
              {SITE.repoFullName}
            </a>
          </div>

          <nav aria-label="文档" className="flex flex-col gap-3">
            <Typography className="eyebrow" type="body-xs" weight="semibold">
              文档
            </Typography>
            {DOC_LINKS.map((link) => (
              <Link
                key={link.href}
                className="w-fit text-xs text-muted transition-colors hover:text-foreground"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="演示站" className="flex flex-col gap-3">
            <Typography className="eyebrow" type="body-xs" weight="semibold">
              演示站
            </Typography>
            {DEMO_LINKS.map((link) => (
              <a
                key={link.href}
                className="w-fit text-xs text-muted transition-colors hover:text-foreground"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Typography color="muted" type="body-xs">
            © {new Date().getFullYear()} Better Admin · MIT License
          </Typography>
          <div className="flex flex-col gap-2 sm:items-end">
            <Typography color="muted" type="body-xs">
              Built by{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href={SITE.ownerUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {SITE.owner}
              </a>
            </Typography>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              {BEIAN.icp ? (
                <a
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  href="https://beian.miit.gov.cn/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                    height={14}
                    loading="lazy"
                    src="/beian/icp.png"
                    width={14}
                  />
                  {BEIAN.icp}
                </a>
              ) : null}
              {BEIAN.police && POLICE_CODE ? (
                <a
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  href={`https://beian.mps.gov.cn/#/query/webSearch?code=${POLICE_CODE}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                    height={14}
                    loading="lazy"
                    src="/beian/gongan.png"
                    width={14}
                  />
                  {BEIAN.police}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
