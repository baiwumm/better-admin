import type { ReactNode } from "react";

import { Button, Typography } from "@heroui/react";
import { Link } from "@tanstack/react-router";

type ErrorPageShellProps = {
  /** 状态码，如 "404" */
  status: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** 自定义操作区；缺省为「返回首页」按钮 */
  actions?: ReactNode;
};

/**
 * 全屏错误页通用壳（Hero UI 风格）：
 * 居中展示状态码 + 图标 + 标题 + 描述 + 操作按钮。
 */
export function ErrorPageShell({
  status,
  title,
  description,
  icon,
  actions,
}: ErrorPageShellProps) {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background p-6 text-foreground">
      <Typography
        className="text-6xl font-bold tracking-tight"
        color="muted"
        type="h1"
      >
        {status}
      </Typography>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-secondary text-muted">
        {icon}
      </div>
      <Typography align="center" className="text-xl font-semibold" type="h2">
        {title}
      </Typography>
      <Typography
        align="center"
        className="max-w-md leading-normal"
        color="muted"
        type="body-sm"
      >
        {description}
      </Typography>
      <div className="mt-4">
        {actions ?? (
          <Link to="/">
            <Button variant="primary">返回首页</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
