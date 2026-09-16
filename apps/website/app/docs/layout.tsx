import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { Github } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { source } from "@/lib/source";
import { SITE } from "@/lib/site";

/**
 * 文档区布局
 *
 * 侧边栏顶部：nav.title 提供项目 Logo + 站名（不传 nav 时只剩一个折叠按钮）。
 * 侧边栏底部：links 里的 icon 型链接会被渲染进底部操作条（与主题切换同排）。
 *             这里刻意不再挂 sidebar.footer——底部只留操作，不放内容卡片。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <>
            <Logo size={24} className="rounded-md" />
            <span className="font-semibold">{SITE.name}</span>
          </>
        ),
        url: "/",
      }}
      links={[
        {
          type: "icon",
          url: SITE.github,
          icon: <Github size={16} />,
          text: "GitHub",
          label: "GitHub 仓库",
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
