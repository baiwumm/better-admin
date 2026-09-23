"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Item, Node } from "fumadocs-core/page-tree";

/**
 * 文档侧边栏导航（beUI 风格：分组折叠 + 当前页胶囊高亮）
 *
 * 数据来自 fumadocs-core 的 page tree（布局层传入）；Folder 用受控 <details> 折叠，
 * 当前页所在分组在水合/导航后自动展开。
 */

/** 静态托管对目录式 URL 会补尾斜杠（本地 serve 与 CF 行为不同），比较前统一去掉 */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function TreeItem({ item }: { item: Item }) {
  const pathname = usePathname();
  const active = normalizePath(pathname ?? "") === item.url;

  const className = `block truncate rounded-lg px-3 py-1.5 text-[13.5px] leading-6 transition-colors ${
    active
      ? "bg-muted font-semibold text-foreground"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
  }`;

  if (item.external) {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className={className}>
        {item.name}
      </a>
    );
  }

  return (
    <Link href={item.url} className={className}>
      {item.name}
    </Link>
  );
}

function groupHasUrl(nodes: Node[], url: string): boolean {
  return nodes.some((node) => {
    if (node.type === "page") return node.url === url;
    if (node.type === "folder") return groupHasUrl(node.children, url);
    return false;
  });
}

function TreeNode({ node }: { node: Node }) {
  const pathname = usePathname();

  if (node.type === "separator") {
    return (
      <div className="px-3 pt-5 pb-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground/80 uppercase">
        {node.name}
      </div>
    );
  }

  if (node.type === "folder") {
    return <FolderNode node={node} pathname={pathname ?? ""} />;
  }

  return <TreeItem item={node} />;
}

function FolderNode({
  node,
  pathname,
}: {
  node: Extract<Node, { type: "folder" }>;
  pathname: string;
}) {
  // 受控 details：SSR（build 期无路径）输出收起；水合/导航后当前分组自动展开
  const hasActive = groupHasUrl(node.children, normalizePath(pathname));
  const [open, setOpen] = useState(hasActive || node.defaultOpen);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group/folder"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-1.5 text-[13.5px] font-medium leading-6 text-foreground transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 truncate">{node.name}</span>
        <svg
          viewBox="0 0 16 16"
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-0.5 ml-[18px] space-y-0.5 border-l border-dashed border-border pl-2">
        {node.children.map((child, i) => (
          <TreeNode key={i} node={child} />
        ))}
      </div>
    </details>
  );
}

/**
 * 文档侧边栏。onNavigate：移动端抽屉里点击链接后收起抽屉用。
 */
export function SidebarNav({
  nodes,
  onNavigate,
}: {
  nodes: Node[];
  onNavigate?: () => void;
}) {
  return (
    <div
      className="space-y-0.5"
      onClick={(event) => {
        if (onNavigate && (event.target as HTMLElement).closest("a[href]")) {
          onNavigate();
        }
      }}
    >
      {nodes.map((node, i) => (
        <TreeNode key={i} node={node} />
      ))}
    </div>
  );
}
