import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Node, Root } from "fumadocs-core/page-tree";
import { findNeighbour } from "fumadocs-core/page-tree";

/**
 * 文档正文页框架（beUI 风格）：面包屑 + 大标题 + 描述 + 正文 + 上下篇。
 *
 * 数据全部来自 fumadocs-core 的 page 对象与 page tree，样式自绘。
 */

/** 在 page tree 中查找 url 的祖先链（面包屑用） */
function findTrail(nodes: Node[], url: string, trail: string[]): string[] {
  for (const node of nodes) {
    if (node.type === "page" && node.url === url) return trail;
    if (node.type === "folder") {
      const found = findTrail(node.children, url, [...trail, String(node.name)]);
      if (found.length > 0) return found;
    }
  }
  return [];
}

export function DocPage({
  tree,
  url,
  title,
  description,
  children,
}: {
  tree: Root;
  url: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const breadcrumb = findTrail(tree.children, url, []);
  const { previous, next } = findNeighbour(tree, url);

  return (
    <article className="mx-auto w-full max-w-2xl">
      {breadcrumb.length > 0 && (
        <nav aria-label="面包屑" className="mb-3 text-[13px] text-muted-foreground">
          {breadcrumb.map((name, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1.5 opacity-50">/</span>}
              {name}
            </span>
          ))}
        </nav>
      )}

      <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-8">{children}</div>

      {(previous || next) && (
        <footer className="mt-14 grid gap-3 border-t border-dashed border-border pt-6 sm:grid-cols-2">
          {previous ? (
            <Link
              href={previous.url}
              className="group flex flex-col gap-1 rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-border hover:bg-muted/40"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeft size={13} />
                上一篇
              </span>
              <span className="text-sm font-semibold group-hover:text-foreground">
                {String(previous.name)}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={next.url}
              className="group flex flex-col items-end gap-1 rounded-xl border border-transparent px-4 py-3 text-end transition-colors hover:border-border hover:bg-muted/40 sm:col-start-2"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                下一篇
                <ArrowRight size={13} />
              </span>
              <span className="text-sm font-semibold group-hover:text-foreground">
                {String(next.name)}
              </span>
            </Link>
          )}
        </footer>
      )}
    </article>
  );
}
