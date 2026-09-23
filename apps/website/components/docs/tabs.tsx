"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * 自绘分段 Tabs（beUI 风格：黑白胶囊分段控件）
 *
 * 简单模式 API 与 fumadocs-ui 的 Tabs 保持一致——`items` 定义触发器文案、
 * `<Tab value>` 对应内容，MDX 内容侧零改动。
 * 带图标触发器（StackTabs）用受控的 SegmentedControl 自行拼装。
 */

interface TabsState {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsState | null>(null);

export interface SegmentOption {
  value: string;
  label: ReactNode;
}

/** 受控分段控件：一行胶囊容器 + 激活项浮起。StackTabs 与 Tabs 共用 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  idPrefix,
}: {
  options: SegmentOption[];
  value: string;
  onValueChange: (value: string) => void;
  idPrefix?: string;
}) {
  if (options.length === 0) return null;

  return (
    <div
      role="tablist"
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            id={idPrefix ? `${idPrefix}-${option.value}` : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(option.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({
  items,
  children,
}: {
  items?: string[];
  children: ReactNode;
}) {
  const labels = useMemo(() => {
    if (items && items.length > 0) return items;
    // 未传 items 时（进阶用法），从 <Tab value> 子元素推导
    return Children.toArray(children).flatMap((child) =>
      isValidElement<{ value?: string }>(child) &&
      typeof child.props.value === "string"
        ? [child.props.value]
        : [],
    );
  }, [items, children]);

  const [value, setValue] = useState(labels[0] ?? "");

  return (
    <div className="my-4">
      <SegmentedControl
        options={labels.map((label) => ({ value: label, label }))}
        value={value}
        onValueChange={setValue}
      />
      <TabsContext.Provider value={{ value, setValue }}>
        {children}
      </TabsContext.Provider>
    </div>
  );
}

export function Tab({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return (
    <div role="tabpanel" className="mt-3 rounded-xl border border-border bg-card/60 px-5 py-4">
      {children}
    </div>
  );
}
