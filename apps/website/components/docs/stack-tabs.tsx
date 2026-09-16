import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "fumadocs-ui/components/tabs";
import { Children, isValidElement, type ReactNode } from "react";
import { STACK_ICON_ENTRIES, StackGlyph } from "@/components/icons/stack-icons";

/**
 * 带技术栈图标的分栏（Tabs）
 *
 * 用法与 fumadocs 的简单模式一致——只是把 `<Tabs items={[...]}>` 换成 `<StackTabs>`：
 *
 * ```mdx
 * <StackTabs>
 *   <Tab value="React"> ... </Tab>
 *   <Tab value="Vue"> ... </Tab>
 * </StackTabs>
 * ```
 *
 * 为什么需要这个包装：fumadocs `Tabs` 的 `items` 只接受 `string[]`，生成的触发标签
 * 是纯文本、插不进图标；这里改用它的进阶 API 自己拼 `TabsList` / `TabsTrigger`，
 * 顺带把「标签文案」收敛到 `<Tab value>` 一处，避免原来 items 与 value 写两遍。
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

/** 只读 `<Tab>` 元素的 props，不渲染它们——内容会被搬进 TabsContent 里 */
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

  if (tabs.length === 0) {
    throw new Error(
      "<StackTabs> 需要一个或多个带 value 的 <Tab> 子元素，例如 <Tab value=\"React\">",
    );
  }

  return (
    <Tabs defaultValue={tabs[0].value}>
      <TabsList>
        {tabs.map(({ value }) => (
          <TabsTrigger key={value} value={value}>
            <StackIcons value={value} />
            <span>{value}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(({ value, content }) => (
        <TabsContent key={value} value={value}>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
