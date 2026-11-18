import { Typography } from "@heroui/react";

import { type StackKey, StackGlyph } from "@/components/icons/stack-icons";

/**
 * Hero 右侧「规格表」：用真实的应用清单当主视觉，替代装饰性插画。
 * 每一行是一条目录 + 它的角色，数据与文档「五个应用」表格同源。
 */
const APPS: { dir: string; icon: StackKey; role: string }[] = [
  { dir: "apps/react", icon: "react", role: "UI Source of Truth" },
  { dir: "apps/vue", icon: "vue", role: "Nuxt UI v4 复刻" },
  { dir: "apps/next", icon: "nextjs", role: "独立全栈" },
  { dir: "apps/nuxt", icon: "nuxt", role: "独立全栈" },
  { dir: "apps/nest", icon: "nestjs", role: "REST API" },
];

export function SpecSheet() {
  return (
    <section aria-label="五个应用的分工一览" className="frame">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <Typography
          className="font-mono tracking-[0.18em] uppercase"
          color="muted"
          type="body-xs"
        >
          apps/
        </Typography>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <Typography className="font-mono" color="muted" type="body-xs">
            5 端已上线
          </Typography>
        </span>
      </div>

      <ul>
        {APPS.map((app) => (
          <li key={app.dir} className="spec-row">
            <StackGlyph className="size-4 shrink-0" stack={app.icon} />
            <span className="font-mono text-xs text-foreground">{app.dir}</span>
            <Typography
              align="end"
              className="ml-auto"
              color="muted"
              type="body-xs"
            >
              {app.role}
            </Typography>
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-2.5">
        <Typography className="font-mono" color="muted" type="body-xs">
          1 PostgreSQL · 1 OpenAPI contract · 29/29 features
        </Typography>
      </div>
    </section>
  );
}
