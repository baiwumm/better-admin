import type { AuthUser } from "@/lib/api-types";
import type { StatsOverview } from "@/lib/api-types";

import { Button, Card, Skeleton, Tabs, Typography } from "@heroui/react";
import NumberFlow from "@number-flow/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, History, LogIn, RotateCcw, Users } from "lucide-react";
import { Suspense, lazy, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { KpiCard } from "./kpi-card";
import { LatestNoticesCard } from "./latest-notices-card";
import { RecentActivityCard } from "./recent-activity-card";
import { STATS_OVERVIEW_QUERY_KEY, fetchStatsOverview } from "./stats-api";
import { WelcomeBanner } from "./welcome-banner";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useMenus } from "@/hooks/use-menus";
import { collectMenuPaths } from "@/lib/menu-utils";
import { useAuthStore } from "@/stores/auth-store";
import "./dashboard.css";

/**
 * Dashboard 概览页（Phase C，契约 v1.12.0；plan-dashboard-playground.md §4）。
 *
 * 布局骨架（§4.1，HeroUI Pro 风格基准）：欢迎横幅（时段问候 + 日期/天气
 * Chip + 快捷入口，见 welcome-banner.tsx）→
 * KPI 行（4 张扁平卡：图标徽标 + 标题 + 右上状态 badge + 大数字 + 底部通栏
 * sparkline）→
 * 主图表卡（登录趋势：卡头右侧时间范围 Tabs + 卡内周期/日均小结带）+
 * 角色占比卡（等高自适应，圆心显示成员总数）→ 最近动态 + 最新公告
 * （各 1/2，卡头带查看全部入口）。
 *
 * - 数据：单一聚合接口 GET /stats/overview，**整页只有一个查询 key**；
 *   趋势区间 7/30 日是图表的视图状态，对固定 30 点的 loginTrend 本地截取，
 *   切 Tabs 不发请求（v1.11.0 曾把 days 拼进 queryKey，导致局部控件重拉整页）；
 * - 图表：recharts 经 React.lazy 分包（不进首屏 chunk），Skeleton 等高占位杜绝跳变；
 * - 动画：区块入场 stagger（CSS，尊重 prefers-reduced-motion）+ NumberFlow 数字滚动；
 * - 视觉：全部复用项目级 Design Tokens，不新增色值 / 圆角 / 阴影；
 * - 宽屏：内容限宽 max-w-7xl 居中（ui-spec §1.2 非 fluid Main 口径），避免版面被拉散。
 */

const LoginTrendChart = lazy(() => import("./login-trend-chart"));
const RoleDistributionChart = lazy(() => import("./role-distribution-chart"));

/** 动态 / 公告「查看全部」目标路径（与 welcome-banner 快捷入口同源） */
const ACTIVITY_PATH = "/settings/logs";
const NOTICES_PATH = "/org/notices";

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
}

/**
 * 主图卡小结指标（标签在上、值在下）：只承担「读图前的量级参考」，
 * 不重复 KPI 行已有的今日登录与环比，把垂直空间让给图表本身。
 */
function MetricStat({ label, value }: MetricStatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <Typography color="muted" type="body-xs">
        {label}
      </Typography>
      <span
        className="text-lg font-semibold leading-6 tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        <NumberFlow value={value} />
      </span>
    </div>
  );
}

interface DashboardSkeletonProps {
  message: string;
}

/**
 * 整页骨架：布局与真实内容一致（§4.1 视觉语言 5，杜绝跳变）。
 * 圆角必须与 HeroUI Card 相同（实测 `min(32px, --radius-3xl)` = 24px），
 * 用 rounded-3xl 而非 rounded-xl，否则加载→内容替换瞬间圆角跳变。
 */
function DashboardSkeleton({ message }: DashboardSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={message}
      className="mx-auto flex w-full max-w-7xl flex-col gap-6"
    >
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

interface DashboardContentProps {
  user: AuthUser;
  data: StatsOverview;
}

/** 数据就绪后的完整内容（被 stagger 编排的各区块） */
function DashboardContent({ user, data }: DashboardContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kpis } = data;
  const delta = loginDeltaPercent(kpis);
  // 趋势区间是图表的视图状态：接口固定给 30 点，这里本地截取，切 Tabs 不发请求
  const [days, setDays] = useState<7 | 30>(7);
  const trendSeries = useMemo(
    () => data.loginTrend.slice(-days),
    [data.loginTrend, days],
  );
  // 主图卡两项小结指标随所选区间变化（序列求和与均值，纯前端计算）
  const periodTotal = trendSeries.reduce((sum, p) => sum + p.count, 0);
  const dailyAvg = trendSeries.length
    ? Math.round(periodTotal / trendSeries.length)
    : 0;

  // 「查看全部」入口与路由守卫同判据：无该模块可见菜单时不出入口
  const { data: menuTree } = useMenus();
  const viewAllActions = useMemo(() => {
    const visiblePaths = collectMenuPaths(menuTree ?? []);

    const build = (path: string, label: string) =>
      visiblePaths.has(path) ? (
        <Button
          size="sm"
          variant="ghost"
          onPress={() => void navigate({ to: path })}
        >
          {label}
        </Button>
      ) : null;

    return {
      activity: build(ACTIVITY_PATH, t("features.dashboard.activity.viewAll")),
      notices: build(NOTICES_PATH, t("features.dashboard.notices.viewAll")),
    };
  }, [menuTree, navigate, t]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* 页头：欢迎横幅（问候 + 日期/天气 + 快捷入口） */}
      <div data-dashboard-stagger="1">
        <WelcomeBanner user={user} />
      </div>

      {/* KPI 行（4 张卡：图标徽标 + 标题 + 右上 badge + 大数字 + 底部通栏趋势带） */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-dashboard-stagger="2"
      >
        <KpiCard
          badge={t("features.dashboard.kpi.usersToday", {
            count: kpis.usersTodayNew,
          })}
          /* 零值不该占用主色语义（看起来像坏数据），归零时降为中性灰 */
          badgeTone={kpis.usersTodayNew === 0 ? "neutral" : "accent"}
          icon={Users}
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
          icon={LogIn}
          label={t("features.dashboard.kpi.logins")}
          series={kpis.loginsDailyNew}
          value={kpis.loginsToday}
        />
        <KpiCard
          badge={t("features.dashboard.kpi.logsToday", {
            count: kpis.logsToday,
          })}
          icon={History}
          label={t("features.dashboard.kpi.logs")}
          series={kpis.logsDailyNew}
          value={kpis.logsTotal}
        />
        <KpiCard
          badge={t("features.dashboard.kpi.orgPosts", {
            count: kpis.postsCount,
          })}
          icon={Building2}
          label={t("features.dashboard.kpi.org")}
          value={kpis.deptsCount}
        />
      </div>

      {/* 主图表卡（2/3，卡头右侧时间范围切换）+ 角色占比卡（1/3，等高自适应） */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        data-dashboard-stagger="3"
      >
        <Card className="dashboard-card flex flex-col lg:col-span-2">
          <Card.Header className="flex-row flex-nowrap items-center justify-between gap-3">
            <Card.Title className="min-w-0 truncate text-base">
              {t("features.dashboard.chart.loginTrend")}
            </Card.Title>
            <Tabs
              aria-label={t("features.dashboard.range.label")}
              className="shrink-0"
              selectedKey={String(days)}
              onSelectionChange={(key) => setDays(Number(key) as 7 | 30)}
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
          <Card.Content className="flex min-h-0 flex-1 flex-col gap-3">
            {/* 小结带：浅底成组，与下方图表拉开层次（值随所选区间变化） */}
            <div className="flex items-center gap-6 rounded-2xl bg-surface-secondary/60 px-4 py-2.5">
              <MetricStat
                label={t("features.dashboard.chart.periodLogins")}
                value={periodTotal}
              />
              <span
                aria-hidden
                className="h-8 w-px"
                style={{ background: "var(--border)" }}
              />
              <MetricStat
                label={t("features.dashboard.chart.dailyAvgLogins")}
                value={dailyAvg}
              />
            </div>
            <div className="flex min-h-0 flex-1">
              <Suspense
                fallback={
                  <Skeleton className="dashboard-trend-glow min-h-56 w-full flex-1 rounded-3xl" />
                }
              >
                <LoginTrendChart series={trendSeries} />
              </Suspense>
            </div>
          </Card.Content>
        </Card>
        <Card className="dashboard-card flex flex-col">
          <Card.Header>
            <Card.Title className="text-base">
              {t("features.dashboard.chart.roles")}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex min-h-0 flex-1 flex-col">
            <Suspense
              fallback={
                <Skeleton className="min-h-56 w-full flex-1 rounded-3xl" />
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
        {/*
          动态单行约 50px、公告两行约 68px，取 7 条与 5 条公告的内容高度
          （≈335px）基本齐平，两卡并排时不再出现整块底部空白（契约 ≤10）。
        */}
        <RecentActivityCard
          action={viewAllActions.activity}
          items={data.recentLogs.slice(0, 7)}
        />
        <LatestNoticesCard
          action={viewAllActions.notices}
          items={data.latestNotices}
        />
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

  // 整页仅此一个查询：v1.12.0 起接口无取数参数，趋势区间在内容层本地切换
  const query = useQuery({
    queryKey: STATS_OVERVIEW_QUERY_KEY,
    queryFn: fetchStatsOverview,
    staleTime: 60_000,
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

  return <DashboardContent data={query.data} user={user} />;
}
