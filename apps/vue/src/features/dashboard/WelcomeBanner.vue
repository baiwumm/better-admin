<script setup lang="ts">
import type { AuthUser } from "@/lib/api-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useMenus } from "@/composables/use-menus";
import { collectMenuPaths } from "@/lib/menu-utils";

/**
 * 欢迎横幅（对齐 React 端 welcome-banner，替代纯文本页头）：
 *
 * - 左侧：时段问候 + 情绪副标题 + 信息 Chip 行（当日日期为真实本地时间；
 *   天气为按日期确定性生成的虚拟演示数据，刷新/重渲不跳变）；
 * - 右侧：快捷入口按钮（导航语义），按用户可见菜单过滤后渲染，
 *   与路由守卫同一判据（collectMenuPaths），避免展示越权入口；
 * - 视觉：主色径向光晕 + 同心圆环装饰（styles/dashboard.css，token 取色），
 *   不新增任何色值 / 圆角 / 阴影。
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
  (typeof WARM_CONDITIONS)[number] | (typeof COLD_CONDITIONS)[number];

/** 各月基准气温（虚构北温带四季曲线，单位 ℃） */
const MONTH_BASE_TEMP = [2, 5, 10, 16, 22, 26, 30, 29, 24, 18, 10, 4];

const CONDITION_ICON: Record<WeatherCondition, string> = {
  cloudy: "i-lucide-cloud-sun",
  overcast: "i-lucide-cloud",
  rainy: "i-lucide-cloud-rain",
  snowy: "i-lucide-cloud-snow",
  sunny: "i-lucide-sun",
  windy: "i-lucide-wind",
};

/** 快捷入口（导航至对应模块页；首个为主操作样式，其余 outline） */
const QUICK_LINKS = [
  { icon: "i-lucide-users", labelKey: "menu.users", to: "/settings/users" },
  { icon: "i-lucide-megaphone", labelKey: "menu.notices", to: "/org/notices" },
  { icon: "i-lucide-scroll-text", labelKey: "menu.logs", to: "/settings/logs" },
] as const;

/** 按日期确定性生成当日「天气」（演示数据，同一天内恒定） */
function weatherOfDay(date: Date): {
  condition: WeatherCondition;
  temp: number;
} {
  const month = date.getMonth();
  const pool: readonly WeatherCondition[] =
    month === 11 || month <= 1 ? COLD_CONDITIONS : WARM_CONDITIONS;
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

defineProps<{ user: AuthUser }>();

const { t, locale } = useI18n();
const { data: menus } = useMenus();

const now = new Date();
const hour = now.getHours();

// 与路由守卫同判据：目标路径在用户可见菜单集合内才渲染入口
const links = computed(() => {
  const visiblePaths = collectMenuPaths(menus.value ?? []);

  return QUICK_LINKS.filter((link) => visiblePaths.has(link.to));
});

// 日期与星期分两段取词后按语言习惯连接：zh-CN「9月19日 星期六」、
// en「Saturday, September 19」，避免默认拼合后的挤压观感
const dateText = computed(() => {
  const weekdayPart = new Intl.DateTimeFormat(locale.value, {
    weekday: "long",
  }).format(now);
  const datePart = new Intl.DateTimeFormat(locale.value, {
    day: "numeric",
    month: "long",
  }).format(now);

  return locale.value.startsWith("en")
    ? `${weekdayPart}, ${datePart}`
    : `${datePart} ${weekdayPart}`;
});

const weather = weatherOfDay(now);
</script>

<template>
  <UCard class="dashboard-welcome">
    <div
      class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-highlighted text-2xl font-semibold tracking-tight">
          {{ t(greetingKey(hour), { name: user.displayName }) }}
        </h1>
        <p class="text-muted text-sm">
          {{ t(subtitleKey(hour)) }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            icon="i-lucide-calendar-days"
            :label="dateText"
            size="sm"
            variant="soft"
          />
          <UBadge
            :title="t('features.dashboard.banner.demoWeather')"
            color="neutral"
            :icon="CONDITION_ICON[weather.condition]"
            :label="`${t(`features.dashboard.banner.weather.${weather.condition}`)} ${weather.temp}°C`"
            size="sm"
            variant="soft"
          />
        </div>
      </div>
      <nav
        v-if="links.length > 0"
        :aria-label="t('features.dashboard.banner.quickLinks')"
        class="flex flex-wrap items-center gap-2 lg:justify-end"
      >
        <UButton
          v-for="(link, index) in links"
          :key="link.to"
          :color="index === 0 ? 'primary' : 'neutral'"
          :icon="link.icon"
          :label="t(link.labelKey)"
          size="sm"
          :to="link.to"
          :variant="index === 0 ? 'solid' : 'outline'"
        />
      </nav>
    </div>
  </UCard>
</template>
