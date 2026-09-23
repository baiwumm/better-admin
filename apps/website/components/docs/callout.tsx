import { Info, Lightbulb, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 提示块（beUI 风格：虚线边框卡片 + 图标语义）
 *
 * API 与 fumadocs-ui 的 Callout 保持一致（title / type / children），MDX 内容零改动。
 * 站点整体是黑白极简基调，type 语义只通过图标与极少量色相表达，不整块铺彩。
 */

const TYPES = {
  info: { icon: Info, className: "text-foreground" },
  tip: { icon: Lightbulb, className: "text-emerald-600 dark:text-emerald-400" },
  warn: { icon: TriangleAlert, className: "text-amber-600 dark:text-amber-400" },
  error: { icon: OctagonAlert, className: "text-red-600 dark:text-red-400" },
} as const;

export function Callout({
  title,
  type = "info",
  children,
}: {
  title?: ReactNode;
  type?: keyof typeof TYPES;
  children?: ReactNode;
}) {
  const { icon: Icon, className } = TYPES[type] ?? TYPES.info;

  return (
    <aside className="my-5 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-4">
      <div className="flex gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${className}`} />
        <div className="min-w-0 text-[15px] leading-relaxed">
          {title && <div className="font-semibold">{title}</div>}
          {children && (
            <div className={title ? "mt-1.5 text-sm" : undefined}>
              {children}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
