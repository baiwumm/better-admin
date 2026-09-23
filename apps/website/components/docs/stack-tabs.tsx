"use client";

import { useState, type ReactNode } from "react";
import { Children, isValidElement } from "react";
import { SegmentedControl } from "@/components/docs/tabs";
import { STACK_ICON_ENTRIES, StackGlyph } from "@/components/icons/stack-icons";

/**
 * 带技术栈图标的分栏（Tabs）
 *
 * 用法：
 *
 * ```mdx
 * <StackTabs>
 *   <Tab value="React"> ... </Tab>
 *   <Tab value="Vue"> ... </Tab>
 * </StackTabs>
 * ```
 *
 * 触发器带技术栈图标，因此不用通用 Tabs 的纯文本触发器；
 * 这里借 SegmentedControl（受控）自行管理选中态，把「标签文案」收敛到
 * `<Tab value>` 一处，避免 items 与 value 写两遍。
 *
 * 图标按 `value` 文案自动识别：命中几个技术栈就渲染几个图标，
 * 因此 "React / Vue（纯前端）" 这类合并标题会并排出现两枚图标。
 */

/** 从标签文案中识别技术栈；未命中（如「认证与账户」）则不渲染图标 */
function StackIcons({ value }: { value: string }) {
  const hits = STACK_ICON_ENTRIES.filter(({ label }) => value.includes(label));
  if (hits.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {hits.map(({ stack }) => (
        <StackGlyph key={stack} stack={stack} />
      ))}
    </span>
  );
}

/** 只读 `<Tab>` 元素的 props，不渲染它们——内容被搬进受控面板里 */
function collectTabs(children: ReactNode) {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const { value, children: content } = child.props as {
      value?: unknown;
      children?: ReactNode;
    };
    return typeof value === "string" ? [{ value, content }] : [];
  });
}

export function StackTabs({ children }: { children: ReactNode }) {
  const tabs = collectTabs(children);
  const [active, setActive] = useState(tabs[0]?.value ?? "");

  if (tabs.length === 0) {
    throw new Error(
      "<StackTabs> 需要一个或多个带 value 的 <Tab> 子元素，例如 <Tab value=\"React\">",
    );
  }

  const current = tabs.find(({ value }) => value === active) ?? tabs[0];

  return (
    <div className="my-4">
      <SegmentedControl
        options={tabs.map(({ value }) => ({
          value,
          label: (
            <>
              <StackIcons value={value} />
              <span>{value}</span>
            </>
          ),
        }))}
        value={current.value}
        onValueChange={setActive}
      />
      <div
        role="tabpanel"
        className="mt-3 rounded-xl border border-border bg-card/60 px-5 py-4"
      >
        {current.content}
      </div>
    </div>
  );
}
