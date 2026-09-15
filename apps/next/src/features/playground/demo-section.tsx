"use client";

import type { DemoMeta } from "./types";
import type { ReactNode } from "react";

import { Card, Label, cn } from "@heroui/react";

import { PlaygroundIntro } from "./playground-intro";

export interface PlaygroundPageProps {
  meta: DemoMeta;
  children: ReactNode;
}

/** 演示页骨架：页首固定 `PlaygroundIntro` 信息卡，下方纵向排布各演示区块。 */
export function PlaygroundPage({ meta, children }: PlaygroundPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <PlaygroundIntro meta={meta} />
      {children}
    </div>
  );
}

export interface DemoSectionProps {
  title: string;
  description?: string;
  /** 交互控件区（自动换行），渲染在演示内容上方 */
  controls?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** 单个演示区块：标题 / 描述 + 可选控件栏 + 演示内容，统一各页视觉。 */
export function DemoSection({
  title,
  description,
  controls,
  className,
  children,
}: DemoSectionProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">{title}</Card.Title>
        {description ? (
          <Card.Description className="text-xs">{description}</Card.Description>
        ) : null}
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {controls ? (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            {controls}
          </div>
        ) : null}
        <div className={cn("flex flex-col gap-4", className)}>{children}</div>
      </Card.Content>
    </Card>
  );
}

export interface DemoControlProps {
  label: string;
  className?: string;
  children: ReactNode;
}

/** 控件栏内的单个带标签控件。 */
export function DemoControl({ label, className, children }: DemoControlProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs text-muted">{label}</Label>
      {children}
    </div>
  );
}

/** 演示内容的展示台：居中、留白、浅底，供 orb / 计数器等视觉组件落位。 */
export function DemoStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-wrap items-center justify-center gap-6 rounded-3xl bg-default/40 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
