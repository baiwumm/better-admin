import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type DocsBreadcrumbItem = {
  name: string;
  /** 最后一项是当前页，不传 url */
  url?: string;
};

/** 文档页面包屑：与 BreadcrumbList JSON-LD 共用同一份 items，保证可见内容与标记一致 */
export function DocsBreadcrumb({ items }: { items: DocsBreadcrumbItem[] }) {
  return (
    <nav
      aria-label="面包屑"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {items.map((item, index) => (
        <span
          key={`${item.name}-${index}`}
          className="flex min-w-0 items-center gap-1.5"
        >
          {index > 0 ? (
            <ChevronRight aria-hidden className="size-3.5 shrink-0" />
          ) : null}
          {item.url ? (
            <Link
              className="truncate transition-opacity hover:opacity-80"
              href={item.url}
            >
              {item.name}
            </Link>
          ) : (
            <span
              aria-current={index === items.length - 1 ? "page" : undefined}
              className="truncate text-foreground"
            >
              {item.name}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
