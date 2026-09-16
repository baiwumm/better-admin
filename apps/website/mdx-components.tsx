import defaultMdxComponents from "fumadocs-ui/mdx";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
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
import type { MDXComponents } from "mdx/types";

/**
 * MDX 可用组件白名单
 *
 * 文档正文只允许使用这里注册的组件——内容真源在 `content/`，
 * 保持组件面收窄，避免有人顺手引入未审查的第三方组件。
 */
export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    ...defaultMdxComponents,
    Cards,
    Card,
    Callout,
    Steps,
    Step,
    Tabs,
    Tab,
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
