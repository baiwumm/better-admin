import type { CSSProperties, ReactNode } from "react";
import { CopyButton } from "@/components/docs/copy-button";

/**
 * 代码块容器（beUI 风格：标签栏 + 复制按钮 + 圆角面板）
 *
 * 高亮由 fumadocs-mdx 在构建期用 shiki 完成（github-light / github-dark 双主题、
 * CSS 变量内联，暗色切换规则见 globals.css 的 `.shiki span`）。
 * 原始 <pre> 元素（含 shiki 主题 class）由 MDX 的 pre 映射透传进来，必须保留，
 * 否则主题变量失去挂载点。
 */
export function CodeBlock({
  code,
  language,
  preClassName,
  preStyle,
  children,
}: {
  /** 纯文本代码（复制用），自 shiki 高亮元素树提取 */
  code: string;
  language: string;
  /** 原始 <pre> 的 class（shiki shiki-themes github-light github-dark …） */
  preClassName?: string;
  preStyle?: CSSProperties;
  /** 构建期高亮产物（<code> 行集），原样渲染 */
  children: ReactNode;
}) {
  return (
    <figure className="group/code my-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-20px_rgb(0_0_0/0.22)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_12px_32px_-20px_rgb(0_0_0/0.8)]">
      <figcaption className="flex items-center justify-between border-b border-dashed border-border px-4 py-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          {language}
        </span>
        <CopyButton code={code} />
      </figcaption>
      <pre
        className={`docs-scrollbar m-0 max-h-96 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 ${preClassName ?? ""}`}
        style={preStyle}
      >
        {children}
      </pre>
    </figure>
  );
}
