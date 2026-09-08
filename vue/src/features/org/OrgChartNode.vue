<script setup lang="ts">
import type { DeptTreeNode } from "@/lib/api-types";
import { Handle, Position } from "@vue-flow/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { CHART_NODE_HEIGHT, CHART_NODE_WIDTH } from "./org-chart-layout";

/**
 * 组织架构图谱自定义节点（只读卡片，企业级视觉，对应 React 端
 * org-chart-node.tsx；经 VueFlow 的 #node-dept 插槽渲染）。
 *
 * - 使用 UCard / UAvatar / UBadge / UTooltip / UButton 复合组件；
 * - 尺寸固定（CHART_NODE_WIDTH/HEIGHT），是手写树布局正确性的前提；
 * - 折叠 / 展开为节点底部悬浮圆钮，外层 @click.stop 拦截冒泡
 *   防止误触 vue-flow 的节点点击跳转；
 * - 节点点击（跳转通讯录）由 VueFlow 的 @node-click 统一处理；
 * - Handle 隐藏（只读图谱无连线交互，仅作连线锚点）；
 * - 停用组织整卡去饱和 + 降透明（沿用组织树置灰语义）；
 * - isRoot 为图谱虚拟根节点（Better Admin）：主色品牌卡，点击不跳转。
 */
export interface DeptNodeData {
  dept: DeptTreeNode;
  /** 直接下级组织数（折叠时按钮展示 +N，底部行展示归属） */
  childCount: number;
  isCollapsed: boolean;
  /** 有下级组织才显示折叠按钮 */
  expandable: boolean;
  /** 图谱虚拟根节点（Better Admin） */
  isRoot: boolean;
}

const props = defineProps<{
  data: DeptNodeData;
}>();

const emit = defineEmits<{ toggle: [id: string] }>();

const { t } = useI18n();

const dept = computed(() => props.data.dept);
const isDisabled = computed(
  () => !props.data.isRoot && dept.value.status === "disabled",
);
const statusLabel = computed(() =>
  props.data.isRoot
    ? t("features.chart.rootBadge")
    : isDisabled.value
      ? t("features.depts.status.disabled")
      : t("features.depts.status.enabled"),
);

const footerLine = computed(() => {
  if (props.data.isRoot) {
    return t("features.chart.rootSubtitle", { count: props.data.childCount });
  }

  return props.data.childCount > 0
    ? t("features.chart.childCountLine", { count: props.data.childCount })
    : t("features.chart.leafNode");
});
</script>

<script lang="ts">
export default { name: "OrgChartNode" };
</script>

<template>
  <UCard
    :class="[
      'group/node hover:-translate-y-1 gap-2 transition-all duration-200',
      { 'opacity-50 saturate-0': isDisabled },
    ]"
    :style="{
      width: `${CHART_NODE_WIDTH}px`,
      height: `${CHART_NODE_HEIGHT}px`,
    }"
  >
    <!-- 只读图谱：Handle 仅作父子连线锚点，隐藏且不可连 -->
    <Handle
      :is-connectable="false"
      :position="Position.Top"
      style="visibility: hidden"
      type="target"
    />
    <Handle
      :is-connectable="false"
      :position="Position.Bottom"
      style="visibility: hidden"
      type="source"
    />

    <!-- 头部：组织名称（截断时 Tooltip 全名）+ 状态标签 -->
    <div class="flex min-w-0 flex-row items-center gap-2">
      <UTooltip :text="dept.name" :delay-duration="0">
        <span
          :class="
            data.isRoot ? 'text-sm font-semibold' : 'text-[13px] font-semibold'
          "
          class="min-w-0 truncate"
        >
          {{ dept.name }}
        </span>
      </UTooltip>
      <UBadge
        :color="data.isRoot ? 'neutral' : isDisabled ? 'neutral' : 'success'"
        :label="statusLabel"
        class="ms-auto shrink-0"
        size="sm"
        variant="soft"
      />
    </div>

    <!-- 负责人区：圆形头像（有头像显示图片，无头像显示首字）+ 姓名 / 编码两行 -->
    <div class="min-w-0">
      <UTooltip
        v-if="dept.leaderName"
        :text="t('features.chart.leaderLabel', { name: dept.leaderName })"
        :delay-duration="0"
      >
        <div class="flex min-w-0 cursor-default items-center gap-2.5">
          <UAvatar
            :alt="dept.leaderName"
            :src="dept.leaderAvatar ?? undefined"
            :text="dept.leaderName.charAt(0)"
            aria-hidden
            class="shrink-0"
            size="sm"
          />
          <div class="flex min-w-0 flex-col justify-center">
            <span class="truncate text-xs font-semibold">
              {{ dept.leaderName }}
            </span>
            <span
              v-if="dept.code"
              class="text-muted truncate font-mono text-[11px] leading-4"
            >
              {{ dept.code }}
            </span>
          </div>
        </div>
      </UTooltip>
      <div v-else class="text-muted flex items-center gap-2 text-xs">
        <UIcon
          aria-hidden
          class="size-3.5 shrink-0 opacity-60"
          name="i-lucide-user-round"
        />
        <span class="truncate">{{ t("features.chart.noLeader") }}</span>
      </div>
    </div>

    <!-- 底部：归属信息（根节点 = 顶级组织数；普通节点 = 下级数 / 末级标记） -->
    <div class="text-muted flex items-center gap-1 text-xs">
      <UIcon
        :name="data.isRoot ? 'i-lucide-landmark' : 'i-lucide-network'"
        aria-hidden
        class="size-3 shrink-0"
      />
      <span class="truncate">{{ footerLine }}</span>
    </div>

    <!-- 折叠 / 展开：底部悬浮圆钮，@click.stop 防止误触节点跳转 -->
    <UButton
      v-if="data.expandable"
      :aria-label="
        t(
          data.isCollapsed
            ? 'features.chart.node.expand'
            : 'features.chart.node.collapse',
        )
      "
      class="border-default bg-default absolute -bottom-3.5 left-1/2 z-10 h-6 min-w-6 -translate-x-1/2 gap-0.5 rounded-full px-1.5 shadow-sm"
      color="neutral"
      size="sm"
      variant="ghost"
      @click.stop="emit('toggle', dept.id)"
    >
      <UIcon
        :name="
          data.isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'
        "
        aria-hidden
        class="size-3.5"
      />
      <span
        v-if="data.isCollapsed && data.childCount > 0"
        class="text-xs tabular-nums"
      >
        {{ data.childCount }}
      </span>
    </UButton>
  </UCard>
</template>
