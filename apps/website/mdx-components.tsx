import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { Accordion, Accordions } from "@/components/docs/accordion";
import { Callout } from "@/components/docs/callout";
import { Card, Cards } from "@/components/docs/cards";
import { CodeBlock } from "@/components/docs/code-block";
import { Step, Steps } from "@/components/docs/steps";
import { Tab, Tabs } from "@/components/docs/tabs";
import {
  ApiEnvelopeDiagram,
  ArchitectureDiagram,
  AuthFlowDiagram,
  ComponentPriorityDiagram,
  FeatureMatrixDiagram,
  FrontendFlow,
  PermissionBitsDiagram,
  QuickStartFlow,
  RbacChainDiagram,
  RepoStructureDiagram,
  RoadmapDiagram,
  TableGroupsDiagram,
  TokenSwatchDiagram,
} from "@/components/docs/diagrams";
import { StackTabs } from "@/components/docs/stack-tabs";

/**
 * MDX 可用组件白名单（beUI 自绘实现）
 *
 * 文档正文只允许使用这里注册的组件——内容真源在 `content/`。
 * 原 fumadocs-ui 的默认排版组件（标题/链接/表格/代码块等）已全部换成本文件的自绘映射，
 * 组件 API（Callout / Card / Tabs / Steps / Accordion）与 fumadocs-ui 保持兼容，MDX 内容零改动。
 */

/** 从 <pre> 的子元素（<code class="language-x">）取语言 */
function extractLanguage(children: ReactNode): string {
  const child = Children.toArray(children)[0];
  if (isValidElement<{ className?: string }>(child)) {
    return (
      /language-([\w-]+)/.exec(child.props.className ?? "")?.[1] ?? "text"
    );
  }
  return "text";
}

/** 递归提取 React 元素树中的纯文本（构建期 shiki 高亮产物的复制用文本） */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return "";
}

/** 链接：站内走 next/link，外链新开标签并带外跳箭头 */
function MdxLink({
  href = "",
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        {...props}
      >
        {children}
        <ArrowUpRight size={13} className="inline opacity-60" />
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
      {...props}
    >
      {children}
    </Link>
  );
}

export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="mt-10 mb-4 border-t border-dashed border-border pt-8 text-2xl font-bold tracking-tight first:mt-0 first:border-none first:pt-0" {...props} />
    ),
    h2: (props) => (
      <h2 className="mt-10 mb-4 text-xl font-bold tracking-tight" {...props} />
    ),
    h3: (props) => (
      <h3 className="mt-8 mb-3 text-lg font-semibold tracking-tight" {...props} />
    ),
    h4: (props) => (
      <h4 className="mt-6 mb-2 text-[15px] font-semibold" {...props} />
    ),
    h5: (props) => <h5 className="mt-4 mb-2 font-semibold" {...props} />,
    h6: (props) => <h6 className="mt-4 mb-2 font-semibold" {...props} />,
    p: (props) => (
      <p className="my-4 text-[15px] leading-7 first:mt-0" {...props} />
    ),
    a: MdxLink,
    ul: (props) => (
      <ul
        className="my-4 list-disc space-y-1.5 ps-6 text-[15px] leading-7 marker:text-muted-foreground"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="my-4 list-decimal space-y-1.5 ps-6 text-[15px] leading-7 marker:text-muted-foreground"
        {...props}
      />
    ),
    li: (props) => <li className="ps-1" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="my-4 border-l-2 border-foreground/30 ps-4 text-muted-foreground italic"
        {...props}
      />
    ),
    hr: () => <hr className="my-8 border-t border-dashed border-border" />,
    img: (props) => (
      <img
        className="my-5 rounded-xl border border-border"
        loading="lazy"
        {...props}
      />
    ),
    table: (props) => (
      <div className="docs-scrollbar my-5 overflow-x-auto rounded-xl border border-border">
        <table
          className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3.5 [&_td]:py-2.5 [&_th]:border-t [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-3.5 [&_th]:py-2.5 [&_th]:font-semibold [&_tr:first-child>th]:border-t-0 [&_tr:first-child>td]:border-t-0"
          {...props}
        />
      </div>
    ),
    code: (props) => (
      <code
        className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em]"
        {...props}
      />
    ),
    pre: ({ children, className, style }: { children?: ReactNode; className?: string; style?: CSSProperties }) => (
      <CodeBlock
        code={extractText(children)}
        language={extractLanguage(children)}
        preClassName={className}
        preStyle={style}
      >
        {children}
      </CodeBlock>
    ),
    // 原 fumadocs-ui 组件 → 自绘同 API 实现
    Cards,
    Card,
    Callout,
    Steps,
    Step,
    Tabs,
    Tab,
    Accordion,
    Accordions,
    // 自动带技术栈图标的 Tabs（见 components/docs/stack-tabs.tsx）
    StackTabs,
    // 内联 SVG 图集（见 components/docs/diagrams.tsx）
    ArchitectureDiagram,
    RepoStructureDiagram,
    QuickStartFlow,
    TableGroupsDiagram,
    RbacChainDiagram,
    PermissionBitsDiagram,
    AuthFlowDiagram,
    ApiEnvelopeDiagram,
    ComponentPriorityDiagram,
    TokenSwatchDiagram,
    FrontendFlow,
    FeatureMatrixDiagram,
    RoadmapDiagram,
    ...components,
  };
}
