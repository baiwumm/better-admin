"use client";

import { ChevronDown } from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * 手风琴（beUI 风格：极简黑白、胶囊圆角容器）
 *
 * API 与 fumadocs-ui 的 Accordions / Accordion 保持一致（type="single" collapsible /
 * value / title），landing 侧 MDX/TSX 零改动。当前只实现了 landing 用到的 single 模式。
 */

interface AccordionsState {
  openValue?: string;
  toggle: (value: string) => void;
}

const AccordionsContext = createContext<AccordionsState | null>(null);

export function Accordions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  type?: string;
  collapsible?: boolean;
}) {
  const [openValue, setOpenValue] = useState<string | undefined>(undefined);

  return (
    <AccordionsContext.Provider
      value={{
        openValue,
        toggle: (value) =>
          setOpenValue((prev) => (prev === value ? undefined : value)),
      }}
    >
      <div className={className}>{children}</div>
    </AccordionsContext.Provider>
  );
}

export function Accordion({
  value,
  title,
  className,
  children,
}: {
  value: string;
  title: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(AccordionsContext);
  const open = ctx?.openValue === value;

  return (
    <div className={className ?? "border-b border-border last:border-b-0"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => ctx?.toggle(value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-semibold transition-colors hover:bg-muted/40"
      >
        {title}
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* grid 行数动画：0fr ↔ 1fr，比 max-height 更贴合内容实际高度 */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
