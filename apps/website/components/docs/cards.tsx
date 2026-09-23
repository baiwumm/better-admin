import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 卡片 / 卡片组（beUI 风格：card-premium 质感卡片）
 *
 * API 与 fumadocs-ui 的 Cards / Card 保持一致（href / title / description / icon），MDX 内容零改动。
 */

export function Cards({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 grid gap-3 sm:grid-cols-2">{children}</div>
  );
}

export function Card({
  title,
  description,
  href,
  icon,
}: {
  title?: ReactNode;
  description?: ReactNode;
  href?: string;
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        {icon && <span className="icon-tile-sm">{icon}</span>}
        <ArrowUpRight
          size={15}
          className="text-muted-foreground opacity-40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
        />
      </div>
      {title && <div className="mt-3 font-semibold">{title}</div>}
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card-premium group block p-5">
        {body}
      </Link>
    );
  }

  return <div className="card-premium p-5">{body}</div>;
}
