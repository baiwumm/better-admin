import type { AuthUser } from "@/lib/api-types";
import type { StatsOverview } from "@/lib/api-types";

import { Button, Card, Skeleton, Tabs, Typography } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileClock, LogIn, RotateCcw, Users } from "lucide-react";
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
 * 布局骨架（§4.1）：页头行（时段问候 + 时间范围 Tabs）→ KPI 行（4 卡）→
 * 主图表（2/3 登录趋势）+ 副图（1/3 角色占比）→ 最近动态 + 最新公告（各 1/2）。
 *
 * - 数据：单一聚合接口 GET /stats/overview（react-query，days 变化仅 refetch）；
 * - 图表：recharts 经 React.lazy 分包（不进首屏 chunk），Skeleton 等高占位杜绝跳变；
 * - 动画：区块入场 stagger（CSS，尊重 prefers-reduced-motion）+ NumberFlow 数字滚动；
 * - 视觉：全部复用项目级 Design Tokens，不新增色值 / 圆角 / 阴影。
 */

const LoginTrendChart = lazy(() => import("./login-trend-chart"));
const RoleDistributionChart = lazy(() => import("./role-distribution-chart"));

/** 按当前小时返回问候 i18n 键（11 点前早安 / 18 点前午安 / 之后晚安） */
function greetingKey(hour: number): string {
  if (hour < 12) return "features.dashboard.greeting.morning";
  if (hour < 18) return "features.dashboard.greeting.afternoon";

  return "features.dashboard.greeting.evening";
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

interface DashboardSkeletonProps {
  message: string;
}

/** 整页骨架：布局与真实内容一致（§4.1 视觉语言 4，杜绝跳变） */
function DashboardSkeleton({ message }: DashboardSkeletonProps) {
  return (
    <div aria-busy="true" aria-label={message} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

interface DashboardPageProps {
  user: AuthUser;
  data: StatsOverview;
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
}

/** 数据就绪后的完整内容（被 stagger 编排的各区块） */
function DashboardContent({
  user,
  data,
  days,
  onDaysChange,
}: DashboardPageProps) {
  const { t } = useTranslation();
  const { kpis } = data;
  const delta = loginDeltaPercent(kpis);

  return (
    <div className="flex flex-col gap-6">
      {/* 页头行：时段问候 + 时间范围切换 */}
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-dashboard-stagger="1"
      >
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {t(greetingKey(new Date().getHours()), { name: user.displayName })}
          </h1>
          <Typography color="muted" type="body-sm">
            {t("features.dashboard.subtitle")}
          </Typography>
        </div>
        <Tabs
          aria-label={t("features.dashboard.range.label")}
          selectedKey={String(days)}
          onSelectionChange={(key) => onDaysChange(Number(key) as 7 | 30)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t("features.dashboard.range.label")}>
              <Tabs.Tab id="7">{t("features.dashboard.range.days7")}</Tabs.Tab>
              <Tabs.Tab id="30">
                {t("features.dashboard.range.days30")}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {/* KPI 行（4 卡等宽网格） */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        data-dashboard-stagger="2"
      >
        <KpiCard
          icon={Users}
          label={t("features.dashboard.kpi.users")}
          series={kpis.usersDailyNew}
          subline={t("features.dashboard.kpi.usersToday", {
            count: kpis.usersTodayNew,
          })}
          value={kpis.usersTotal}
        />
        <KpiCard
          deltaPercent={delta}
          icon={LogIn}
          label={t("features.dashboard.kpi.logins")}
          series={kpis.loginsDailyNew}
          value={kpis.loginsToday}
        />
        <KpiCard
          icon={FileClock}
          label={t("features.dashboard.kpi.logs")}
          series={kpis.logsDailyNew}
          subline={t("features.dashboard.kpi.logsToday", {
            count: kpis.logsToday,
          })}
          value={kpis.logsTotal}
        />
        <KpiCard
          icon={Building2}
          label={t("features.dashboard.kpi.org")}
          subline={t("features.dashboard.kpi.orgPosts", {
            count: kpis.postsCount,
          })}
          value={kpis.deptsCount}
        />
      </div>

      {/* 主图表（2/3）+ 角色占比（1/3） */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        data-dashboard-stagger="3"
      >
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-base">
              {t("features.dashboard.chart.loginTrend")}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <Suspense
              fallback={
                <Skeleton className="dashboard-trend-glow h-64 w-full rounded-xl" />
              }
            >
              <LoginTrendChart series={data.loginTrend} />
            </Suspense>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title className="text-base">
              {t("features.dashboard.chart.roles")}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <Suspense
              fallback={<Skeleton className="h-48 w-full rounded-xl" />}
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
        <RecentActivityCard items={data.recentLogs} />
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
            <RotateCcw className="size-4" aria-hidden />
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
      user={user}
      onDaysChange={setDays}
    />
  );
}
