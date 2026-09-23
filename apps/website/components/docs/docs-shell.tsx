"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DocsNavbar } from "@/components/docs/docs-navbar";
import { SidebarNav } from "@/components/docs/sidebar-nav";
import type { Node } from "fumadocs-core/page-tree";

/**
 * 文档区布局壳（beUI 风格）
 *
 * 顶栏 + 侧边栏（桌面常驻 / 移动抽屉）+ 正文容器。
 * 正文列与目录列由页面内容自行组织（目录依赖每页数据，见 doc-page / page.tsx）。
 */
export function DocsShell({
  tree,
  children,
}: {
  tree: Node[];
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // 路由变化时收起抽屉（键盘/手势导航兜底）
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const sidebar = (
    <SidebarNav nodes={tree} onNavigate={() => setDrawerOpen(false)} />
  );

  return (
    <div className="min-h-dvh">
      <DocsNavbar onOpenSidebar={() => setDrawerOpen(true)} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:px-6">
        {/* 桌面侧边栏 */}
        <aside className="docs-scrollbar sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] shrink-0 overflow-y-auto py-8 pr-2 lg:block">
          {sidebar}
        </aside>

        {/* 正文（目录列由页面内部渲染） */}
        <main className="min-w-0 py-8">{children}</main>
      </div>

      {/* 移动端侧边栏抽屉 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-90 lg:hidden">
          <button
            type="button"
            aria-label="收起侧边栏"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
          />
          <div className="navbar-premium docs-scrollbar absolute inset-y-0 left-0 w-72 max-w-[82vw] overflow-y-auto rounded-e-2xl p-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-semibold">文档导航</span>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
