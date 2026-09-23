import type { ReactNode } from "react";
import { DocsShell } from "@/components/docs/docs-shell";
import { source } from "@/lib/source";

/**
 * 文档区布局（beUI 自绘壳：顶栏 + 侧边栏，见 components/docs/docs-shell.tsx）。
 * 正文与目录列在页面内组织（目录依赖每页数据）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return <DocsShell tree={source.pageTree.children}>{children}</DocsShell>;
}
