"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * 文档右侧目录（beUI 风格：虚线缩进导轨 + 当前节高亮）
 *
 * scrollspy：视口 15%~35% 这条窄带内的标题视为「当前节」。
 */

export interface TocItem {
  title: ReactNode;
  url: string;
  depth: number;
}

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>("");

  const headingIds = items.map((item) => item.url.slice(1));

  useEffect(() => {
    const headings = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headingIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 text-[13px]">
      <p className="font-semibold tracking-wide text-foreground">本页目录</p>
      <nav className="relative">
        {/* 左侧导轨：贯穿的虚线 + 当前项实线高亮由条目边框覆盖 */}
        <div className="space-y-px border-l border-dashed border-border">
          {items.map((item) => {
            const isActive = item.url === active;
            return (
              <a
                key={item.url}
                href={item.url}
                className={`-ml-px block border-l py-1 transition-colors ${
                  isActive
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={{ paddingLeft: `${(item.depth - 2) * 14 + 12}px` }}
              >
                {item.title}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
