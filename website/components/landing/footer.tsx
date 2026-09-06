"use client";

import { Github } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { TextScramble } from "@/components/text-scramble";
import { SITE } from "@/lib/site";

/** ogimg 风格页脚：品牌+简介居左、社交图标居右，底行版权 + 乱码渐显署名 */
export function Footer() {
  const [isTrigger, setIsTrigger] = useState(false);

  useEffect(() => {
    const start = () => setIsTrigger(true);

    const initial = setTimeout(start, 300);
    const interval = setInterval(start, 3500);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="relative z-10 w-full border-t border-dashed border-black/20 dark:border-white/10">
      <div className="mx-auto px-4 pb-6 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-2">
                <Logo size={32} className="rounded-lg" />
                <span className="text-xl font-extrabold leading-tight tracking-tight">
                  Better Admin
                </span>
              </div>

              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                同一套 Admin
                产品的多技术栈全栈实现，本站是它的官方开发文档；React 是本项目的
                UI Source of Truth。
              </p>
            </div>

            <nav
              aria-label="相关链接"
              className="flex items-center gap-3 md:justify-end md:pt-1"
            >
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Better Admin on GitHub"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github size={20} />
              </a>
            </nav>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-dashed border-black/20 pt-8 text-xs text-muted-foreground sm:flex-row dark:border-white/10">
            <div>
              <span>
                © {new Date().getFullYear()}{" "}
                <a
                  href="/"
                  className="text-foreground underline underline-offset-4 transition-colors hover:opacity-80"
                >
                  Better Admin
                </a>
                . All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Built by</span>
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="baiwumm 的 GitHub"
                className="flex items-center font-medium text-foreground underline underline-offset-4 transition-colors hover:opacity-80"
              >
                <TextScramble
                  className="inline-block w-[7ch] whitespace-nowrap"
                  speed={0.02}
                  trigger={isTrigger}
                  onScrambleComplete={() => setIsTrigger(false)}
                >
                  baiwumm
                </TextScramble>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
