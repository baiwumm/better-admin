"use client";

import type { AuthUser } from "@/lib/api-types";

import { Button, Card, Chip, Typography } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Megaphone,
  ScrollText,
  Sun,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useMenuStore } from "@/stores/menu-store";
import { collectMenuPaths } from "@/lib/menu-utils";

/**
 * 欢迎横幅（替代原「时段问候 + 副标题」纯文本页头；React 基准 2026-09-19 同源移植）：
 *
 * - 左侧：时段问候 + 情绪副标题 + 信息 Chip 行（当日日期为真实本地时间；
 *   天气为按日期确定性生成的虚拟演示数据，刷新/重渲不跳变）；
 * - 右侧：快捷入口按钮（导航语义），按用户可见菜单过滤后渲染，
 *   与 403 门卫同判据（collectMenuPaths），避免展示越权入口；
 * - 视觉：主色径向光晕 + 同心圆环装饰（dashboard.css，token 取色），
 *   不新增任何色值 / 圆角 / 阴影。
 *
 * 与 React 版差异：菜单树来自 RSC 注入的 useMenuStore（Next 无 useMenus），
 * 导航改用 next/navigation useRouter。
 */

/** 暖季 / 寒季天气现象池（寒季仅 12 / 1 / 2 月，无降雨取雪替代） */
const WARM_CONDITIONS = [
  "sunny",
  "cloudy",
  "overcast",
  "rainy",
  "windy",
] as const;
const COLD_CONDITIONS = ["cloudy", "overcast", "snowy", "windy"] as const;

type WeatherCondition =
  | (typeof WARM_CONDITIONS)[number]
  | (typeof COLD_CONDITIONS)[number];

/** 各月基准气温（虚构北温带四季曲线，单位 ℃） */
const MONTH_BASE_TEMP = [2, 5, 10, 16, 22, 26, 30, 29, 24, 18, 10, 4];

const CONDITION_ICON: Record<WeatherCondition, LucideIcon> = {
  cloudy: CloudSun,
  overcast: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  sunny: Sun,
  windy: Wind,
};

/** 按日期确定性生成当日「天气」（演示数据，同一天内恒定） */
function weatherOfDay(date: Date): {
  condition: WeatherCondition;
  temp: number;
} {
  const month = date.getMonth();
  const pool = month === 11 || month <= 1 ? COLD_CONDITIONS : WARM_CONDITIONS;
  const seed = date.getFullYear() * 372 + (month + 1) * 31 + date.getDate();
  const condition = pool[seed % pool.length];
  const temp = MONTH_BASE_TEMP[month] + (seed % 5) - 2;

  return { condition, temp };
}

/** 按当前小时返回问候 i18n 键（5 点前凌晨 / 12 点前早安 / 18 点前午安 / 之后晚安） */
function greetingKey(hour: number): string {
  if (hour < 5) return "features.dashboard.greeting.dawn";
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

/** 快捷入口（导航至对应模块页；首个为主操作样式，其余 outline） */
const QUICK_LINKS = [
  { icon: Users, labelKey: "menu.users", to: "/settings/users" },
  { icon: Megaphone, labelKey: "menu.notices", to: "/org/notices" },
  { icon: ScrollText, labelKey: "menu.logs", to: "/settings/logs" },
] as const;

interface WelcomeBannerProps {
  user: AuthUser;
}

export function WelcomeBanner({ user }: WelcomeBannerProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const menuTree = useMenuStore((s) => s.menus);

  const now = new Date();

  // 与 403 门卫同判据：目标路径在用户可见菜单集合内才渲染入口
  const links = useMemo(() => {
    const visiblePaths = collectMenuPaths(menuTree ?? []);

    return QUICK_LINKS.filter((link) => visiblePaths.has(link.to));
  }, [menuTree]);

  // 日期与星期分两段取词后按语言习惯连接：zh-CN「9月19日 星期六」、
  // en「Saturday, September 19」，避免默认拼合后的挤压观感
  const locale = i18n.language;
  const datePart = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(now);
  const weekdayPart = new Intl.DateTimeFormat(locale, {
    weekday: "long",
  }).format(now);
  const dateText = locale.startsWith("en")
    ? `${weekdayPart}, ${datePart}`
    : `${datePart} ${weekdayPart}`;
  const { condition, temp } = weatherOfDay(now);
  const WeatherIcon = CONDITION_ICON[condition];

  return (
    <Card className="dashboard-welcome overflow-hidden">
      <Card.Content className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            {t(greetingKey(now.getHours()), { name: user.displayName })}
          </h1>
          <Typography color="muted" type="body-sm">
            {t(subtitleKey(now.getHours()))}
          </Typography>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip color="accent" size="sm" variant="soft">
              <CalendarDays aria-hidden width={12} />
              <Chip.Label>{dateText}</Chip.Label>
            </Chip>
            <Chip
              size="sm"
              title={t("features.dashboard.banner.demoWeather")}
              variant="soft"
            >
              <WeatherIcon aria-hidden width={12} />
              <Chip.Label>
                {t(`features.dashboard.banner.weather.${condition}`)} {temp}°C
              </Chip.Label>
            </Chip>
          </div>
        </div>
        {links.length > 0 ? (
          <nav
            aria-label={t("features.dashboard.banner.quickLinks")}
            className="flex flex-wrap items-center gap-2 lg:justify-end"
          >
            {links.map((link, index) => (
              <Button
                key={link.to}
                size="sm"
                variant={index === 0 ? "primary" : "outline"}
                onPress={() => router.push(link.to)}
              >
                <link.icon aria-hidden className="size-4" />
                {t(link.labelKey)}
              </Button>
            ))}
          </nav>
        ) : null}
      </Card.Content>
    </Card>
  );
}
