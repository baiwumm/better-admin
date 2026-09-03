import type { DeptTreeNode } from "@/lib/api-types";
import type { Node, NodeProps } from "@xyflow/react";

import {
  Avatar,
  Button,
  Card,
  Chip,
  Tooltip,
  cn,
  Description,
} from "@heroui/react";
import {
  ChevronDown,
  ChevronUp,
  Landmark,
  Network,
  UserRound,
} from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import { CHART_NODE_HEIGHT, CHART_NODE_WIDTH } from "./org-chart-layout";

import { useTranslation } from "@/i18n";

/**
 * 组织架构图谱自定义节点（只读卡片，企业级视觉）。
 *
 * - 使用 HeroUI Card / Avatar / Chip / Tooltip / Button 复合组件，不手搓 div 外观；
 * - 尺寸固定（CHART_NODE_WIDTH/HEIGHT），是手写树布局正确性的前提；
 * - 折叠 / 展开为节点底部悬浮圆钮（HeroUI Button），外层拦截 click 冒泡
 *   防止误触 React Flow 的节点跳转（onPress 走 React Aria press 语义）；
 * - 节点点击（跳转通讯录）由 ReactFlow 的 onNodeClick 统一处理；
 * - Handle 隐藏（只读图谱无连线交互，仅作连线锚点）；
 * - 停用组织整卡去饱和 + 降透明（沿用组织树置灰语义）；
 * - isRoot 为图谱虚拟根节点（Better Admin，非真实组织）：
 *   主色渐变品牌卡，点击不跳转通讯录（由 org-chart-page 过滤）。
 */

/** 节点 data（type 字面量类型以满足 React Flow v12 的 Record 约束） */
export type DeptNodeData = {
  dept: DeptTreeNode;
  /** 直接下级组织数（折叠时按钮展示 +N，底部行展示归属） */
  childCount: number;
  isCollapsed: boolean;
  /** 有下级组织才显示折叠按钮 */
  expandable: boolean;
  /** 图谱虚拟根节点（Better Admin） */
  isRoot: boolean;
  onToggle: (id: string) => void;
};

export type DeptChartNode = Node<DeptNodeData, "dept">;

/** Avatar 色板：按负责人姓名稳定散列取色（Fallback 显示首字） */
const AVATAR_COLORS = [
  "accent",
  "success",
  "warning",
  "danger",
  "default",
] as const;

type AvatarColor = (typeof AVATAR_COLORS)[number];

function pickAvatarColor(name: string): AvatarColor {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const DeptChartNode = memo(function DeptChartNode({
  data,
}: NodeProps<DeptChartNode>) {
  const { t } = useTranslation();
  const { dept, childCount, isCollapsed, expandable, isRoot, onToggle } = data;
  const isDisabled = !isRoot && dept.status === "disabled";
  const leaderName = dept.leaderName;

  return (
    <Card
      className="group/node hover:-translate-y-1 transition-all duration-200 gap-2"
      style={{ width: CHART_NODE_WIDTH, height: CHART_NODE_HEIGHT }}
    >
      {/* 只读图谱：Handle 仅作父子连线锚点，隐藏且不可连 */}
      <Handle
        isConnectable={false}
        position={Position.Top}
        style={{ visibility: "hidden" }}
        type="target"
      />
      <Handle
        isConnectable={false}
        position={Position.Bottom}
        style={{ visibility: "hidden" }}
        type="source"
      />

      {/* 头部：组织名称（截断时 Tooltip 全名）+ 状态 Chip */}
      <Card.Header className="flex min-w-0 flex-row items-center gap-2 p-0">
        <Tooltip>
          <Tooltip.Trigger>
            <Card.Title
              className={cn(
                "min-w-0 truncate",
                isRoot ? "text-sm font-semibold" : "text-[13px] font-semibold",
              )}
            >
              {dept.name}
            </Card.Title>
          </Tooltip.Trigger>
          <Tooltip.Content>{dept.name}</Tooltip.Content>
        </Tooltip>
        <Chip
          className="ms-auto shrink-0"
          color={isRoot ? "default" : isDisabled ? "default" : "success"}
          size="sm"
          variant="soft"
        >
          {isRoot
            ? t("features.chart.rootBadge")
            : isDisabled
              ? t("features.depts.status.disabled")
              : t("features.depts.status.enabled")}
        </Chip>
      </Card.Header>

      {/* 负责人区（核心）：圆形头像（有头像显示图片，无头像显示首字）+ 姓名 / 组织编码两行 */}
      <Card.Content className="min-w-0 p-0">
        {leaderName ? (
          <Tooltip>
            <Tooltip.Trigger>
              <div className="flex min-w-0 cursor-default items-center gap-2.5">
                <Avatar
                  aria-hidden
                  className="size-7 shrink-0"
                  color={pickAvatarColor(leaderName)}
                  size="sm"
                >
                  {dept.leaderAvatar && (
                    <Avatar.Image alt={leaderName} src={dept.leaderAvatar} />
                  )}
                  <Avatar.Fallback className="text-xs">
                    {leaderName.charAt(0)}
                  </Avatar.Fallback>
                </Avatar>
                <div className="flex min-w-0 flex-col justify-center">
                  <span className="truncate text-xs font-semibold text-default-foreground">
                    {leaderName}
                  </span>
                  {dept.code && (
                    <span className="truncate font-mono text-[11px] leading-4 text-default-500">
                      {dept.code}
                    </span>
                  )}
                </div>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              {t("features.chart.leaderLabel", { name: leaderName })}
            </Tooltip.Content>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2 text-xs text-default-500">
            <UserRound aria-hidden className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">{t("features.chart.noLeader")}</span>
          </div>
        )}
      </Card.Content>

      {/* 底部：归属信息（根节点 = 顶级组织数；普通节点 = 下级数 / 末级标记） */}
      <Card.Footer className="flex items-center gap-1">
        {isRoot ? (
          <Landmark aria-hidden className="size-3 shrink-0" />
        ) : (
          <Network aria-hidden className="size-3 shrink-0" />
        )}
        <Description className="truncate">
          {isRoot
            ? t("features.chart.rootSubtitle", { count: childCount })
            : childCount > 0
              ? t("features.chart.childCountLine", { count: childCount })
              : t("features.chart.leafNode")}
        </Description>
      </Card.Footer>

      {/* 折叠 / 展开：底部悬浮圆钮。React Aria 的 PressEvent 默认停止冒泡
          （不调用 continuePropagation），因此不会误触 React Flow 的节点跳转 */}
      {expandable && (
        <Button
          aria-label={t(
            isCollapsed
              ? "features.chart.node.expand"
              : "features.chart.node.collapse",
          )}
          className="absolute -bottom-3.5 left-1/2 z-10 h-6 min-w-6 -translate-x-1/2 gap-0.5 rounded-full border border-border bg-content1 px-1.5 shadow-sm transition-colors data-[hover=true]:border-primary/40 data-[hover=true]:bg-default/60 dark:bg-content2 dark:data-[hover=true]:bg-default/40"
          size="sm"
          variant="ghost"
          onPress={() => onToggle(dept.id)}
        >
          {isCollapsed ? (
            <ChevronDown aria-hidden className="size-3.5" />
          ) : (
            <ChevronUp aria-hidden className="size-3.5" />
          )}
          {isCollapsed && childCount > 0 && (
            <span className="text-xs tabular-nums">{childCount}</span>
          )}
        </Button>
      )}
    </Card>
  );
});
