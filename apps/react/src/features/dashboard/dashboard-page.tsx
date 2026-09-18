import type { AuthUser } from "@/lib/api-types";
import type { StatsOverview } from "@/lib/api-types";

import { Button, Card, Chip, Skeleton, Tabs, Typography } from "@heroui/react";
import NumberFlow from "@number-flow/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";

import { KpiCard } from "./kpi-card";
import { LatestNoticesCard } from "./latest-notices-card";
import { RecentActivityCard } from "./recent-activity-card";
import { STATS_OVERVIEW_QUERY_KEY, fetchStatsOverview } from "./stats-api";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useAuthStore } from "@/stores/auth-store";
import "./dashboard.css";

/**
 * Dashboard 概览页（Phase C，契约 v1.11.0；plan-dashboard-playground.md §4）。
 *
 * 布局骨架（§4.1，HeroUI Pro 风格基准）：页头行（时段问候 + 用户名）→
 * KPI 行（4 张扁平卡：标题 + 大数字 + 右上状态 badge）→
 * 主图表卡（登录趋势：卡头右侧时间范围 Tabs + 卡内三项小结指标）+
 * 角色占比卡（等高自适应）→ 最近动态 + 最新公告（各 1/2）。
 *
 * - 数据：单一聚合接口 GET /stats/overview（react-query，days 变化仅 refetch）；
 * - 图表：recharts 经 React.lazy 分包（不进首屏 chunk），Skeleton 等高占位杜绝跳变；
 * - 动画：区块入场 stagger（CSS，尊重 prefers-reduced-motion）+ NumberFlow 数字滚动；
 * - 视觉：全部复用项目级 Design Tokens，不新增色值 / 圆角 / 阴影。
 */

const LoginTrendChart = lazy(() => import("./login-trend-chart"));
const RoleDistributionChart = lazy(() => import("./role-distribution-chart"));

/** 按当前小时返回问候 i18n 键（12 点前早安 / 18 点前午安 / 之后晚安） */
function greetingKey(hour: number): string {
  if (hour < 12) return "features.dashboard.greeting.morning";
  if (hour < 18) return "features.dashboard.greeting.afternoon";

  return "features.dashboard.greeting.evening";
}

/** 按时段返回副标题情绪文案 i18n 键（深夜/清晨/上午/午间/午后/晚间） */
function subtitleKey(hour: number): string {
  if (hour < 5) return "features.dashboard.subtitle.lateNight";
  if (hour < 9) return "features.dashboard.subtitle.morning";
  if (hour < 12) return "features.dashboard.subtitle.forenoon";
  if (hour < 14) return "features.dashboard.subtitle.noon";
  if (hour < 18) return "features.dashboard.subtitle.afternoon";

  return "features.dashboard.subtitle.evening";
}

/** 环比昨日百分比（昨日为 0 时不计环比返回 null） */
function loginDeltaPercent(kpis: StatsOverview["kpis"]): number | null {
  if (kpis.loginsYesterday === 0) return null;

  return (
    Math.round(
      ((kpis.loginsToday - kpis.loginsYesterday) / kpis.loginsYesterday) * 1000,
    ) / 10
  );
}

interface MetricStatProps {
  label: string;
  value: number;
  /** 值右侧附加 badge（如今日环比） */
  badge?: React.ReactNode;
  badgeTone?: "up" | "down" | "neutral";
}

/** 主图卡小结指标（HeroUI Pro 风：值 + 灰标签；badge 仅今日项使用） */
function MetricStat({
  label,
  value,
  badge,
  badgeTone = "neutral",
}: MetricStatProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <p
        className="flex items-center gap-1.5 text-lg font-semibold tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        <NumberFlow value={value} />
        {badge ? (
          <Chip
            color={
              badgeTone === "up"
                ? "success"
                : badgeTone === "down"
                  ? "danger"
                  : "default"
            }
            size="sm"
            variant="soft"
          >
            {badge}
          </Chip>
        ) : null}
      </p>
      <Typography color="muted" type="body-xs">
        {label}
      </Typography>
    </div>
  );
}

interface DashboardSkeletonProps {
  message: string;
}

/** 整页骨架：布局与真实内容一致（§4.1 视觉语言 4，杜绝跳变） */
function DashboardSkeleton({ message }: DashboardSkeletonProps) {
  return (
    <div aria-busy="true" aria-label={message} className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

interface DashboardContentProps {
  user: AuthUser;
  data: StatsOverview;
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
  /** 切换时间范围后新数据拉取中（旧数据续显，图表区半透明提示） */
  refreshing?: boolean;
}

/** 数据就绪后的完整内容（被 stagger 编排的各区块） */
function DashboardContent({
  user,
  data,
  days,
  onDaysChange,
  refreshing = false,
}: DashboardContentProps) {
  const { t } = useTranslation();
  const { kpis } = data;
  const delta = loginDeltaPercent(kpis);
  // 主图卡三项小结指标：周期总数 / 日均（序列求和与均值，纯前端计算）
  const periodTotal = data.loginTrend.reduce((sum, p) => sum + p.count, 0);
  const dailyAvg = data.loginTrend.length
    ? Math.round(periodTotal / data.loginTrend.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 页头行：时段问候 */}
      <div data-dashboard-stagger="1">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {t(greetingKey(new Date().getHours()), { name: user.displayName })}
        </h1>
        <Typography color="muted" type="body-sm">
          {t(subtitleKey(new Date().getHours()))}
        </Typography>
      </div>

      {/* KPI 行（4 张扁平卡：标题 + 大数字 + 右上状态 badge） */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-dashboard-stagger="2"
      >
        <KpiCard
          badge={t("features.dashboard.kpi.usersToday", {
            count: kpis.usersTodayNew,
          })}
          badgeTone="accent"
          label={t("features.dashboard.kpi.users")}
          series={kpis.usersDailyNew}
          value={kpis.usersTotal}
        />
        <KpiCard
          badge={
            delta === null
              ? undefined
              : delta === 0
                ? t("features.dashboard.kpi.deltaFlat")
                : `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta)}%`
          }
          badgeTone={
            delta === null || delta === 0
              ? "neutral"
              : delta > 0
                ? "up"
                : "down"
          }
          label={t("features.dashboard.kpi.logins")}
          series={kpis.loginsDailyNew}
          value={kpis.loginsToday}
        />
        <KpiCard
          badge={t("features.dashboard.kpi.logsToday", {
            count: kpis.logsToday,
          })}
          label={t("features.dashboard.kpi.logs")}
          series={kpis.logsDailyNew}
          value={kpis.logsTotal}
        />
        <KpiCard
          badge={t("features.dashboard.kpi.orgPosts", {
            count: kpis.postsCount,
          })}
          label={t("features.dashboard.kpi.org")}
          value={kpis.deptsCount}
        />
      </div>

      {/* 主图表卡（2/3，卡头右侧时间范围切换）+ 角色占比卡（1/3，等高自适应） */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        data-dashboard-stagger="3"
      >
        <Card className="flex flex-col lg:col-span-2">
          <Card.Header className="flex-row flex-nowrap items-center justify-between gap-3">
            <Card.Title className="min-w-0 truncate text-base">
              {t("features.dashboard.chart.loginTrend")}
            </Card.Title>
            <Tabs
              aria-label={t("features.dashboard.range.label")}
              className="shrink-0"
              selectedKey={String(days)}
              onSelectionChange={(key) => onDaysChange(Number(key) as 7 | 30)}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label={t("features.dashboard.range.label")}>
                  <Tabs.Tab className="whitespace-nowrap" id="7">
                    {t("features.dashboard.range.days7")}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab className="whitespace-nowrap" id="30">
                    {t("features.dashboard.range.days30")}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </Card.Header>
          <Card.Content className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricStat
                label={t("features.dashboard.chart.periodLogins")}
                value={periodTotal}
              />
              <MetricStat
                label={t("features.dashboard.chart.dailyAvgLogins")}
                value={dailyAvg}
              />
              <MetricStat
                badge={
                  delta === null || delta === 0
                    ? undefined
                    : `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta)}%`
                }
                badgeTone={delta !== null && delta > 0 ? "up" : "down"}
                label={t("features.dashboard.kpi.logins")}
                value={kpis.loginsToday}
              />
            </div>
            <div
              className={`flex min-h-0 flex-1 transition-opacity ${
                refreshing ? "opacity-60" : "opacity-100"
              }`}
            >
              <Suspense
                fallback={
                  <Skeleton className="dashboard-trend-glow min-h-56 w-full flex-1 rounded-xl" />
                }
              >
                <LoginTrendChart series={data.loginTrend} />
              </Suspense>
            </div>
          </Card.Content>
        </Card>
        <Card className="flex flex-col">
          <Card.Header>
            <Card.Title className="text-base">
              {t("features.dashboard.chart.roles")}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex min-h-0 flex-1 flex-col">
            <Suspense
              fallback={
                <Skeleton className="min-h-56 w-full flex-1 rounded-xl" />
              }
            >
              <RoleDistributionChart slices={data.roleDistribution} />
            </Suspense>
          </Card.Content>
        </Card>
      </div>

      {/* 最近动态 + 最新公告（各 1/2） */}
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        data-dashboard-stagger="4"
      >
        {/* 动态取最近 5 条，与最新公告卡高度基本一致（契约 ≤10，前端截取） */}
        <RecentActivityCard items={data.recentLogs.slice(0, 5)} />
        <LatestNoticesCard items={data.latestNotices} />
      </div>
    </div>
  );
}

interface DashboardErrorProps {
  message: string;
  detail: string;
  onRetry: () => void;
}

/** 整页错误态（§9.3：接口挂掉整页 Skeleton → 错误 + 重试，不白屏） */
function DashboardError({ message, detail, onRetry }: DashboardErrorProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      data-dashboard-stagger="1"
    >
      <EmptyContent
        action={
          <Button size="sm" variant="outline" onPress={onRetry}>
            <RotateCcw aria-hidden className="size-4" />
            {t("common.retry")}
          </Button>
        }
        description={detail}
        title={message}
      />
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  // 登录趋势时间范围（query key 随 days 变化自动 refetch）
  const [days, setDays] = useState<7 | 30>(7);

  const query = useQuery({
    queryKey: [...STATS_OVERVIEW_QUERY_KEY, days],
    queryFn: () => fetchStatsOverview(days),
    staleTime: 60_000,
    // 切换时间范围时保留上一份数据续显（仅图表区间变化），不整页回 Skeleton
    placeholderData: keepPreviousData,
  });

  if (query.isError) {
    return (
      <DashboardError
        detail={query.error.message}
        message={t("features.dashboard.error.title")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!user || !query.data) {
    return <DashboardSkeleton message={t("common.loading")} />;
  }

  return (
    <DashboardContent
      data={query.data}
      days={days}
      refreshing={query.isPlaceholderData}
      user={user}
      onDaysChange={setDays}
    />
  );
}
