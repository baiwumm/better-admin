<script setup lang="ts">
import type { StatsLogItem } from "@/lib/api-types";

import { useI18n } from "vue-i18n";

import { formatRelativeTime } from "@/lib/format-date";

/**
 * 最近动态卡（对齐 React 端 recent-activity-card）：用户首字头像 + 操作人 +
 * 动作人话文案 + 相对时间。数据为 type=operation 日志（服务端已剔除敏感字段；
 * 接口不返回头像 URL 时以姓名首字 fallback 呈现）。
 */

/**
 * action → i18n 键映射（人话文案）。覆盖内置操作与登录/登出动作；
 * 未收录的 action 回退显示原始值（等宽小字，保证不丢信息）。
 */
const ACTION_I18N: Record<string, string> = {
  "user.create": "features.dashboard.action.userCreate",
  "user.update": "features.dashboard.action.userUpdate",
  "user.delete": "features.dashboard.action.userDelete",
  "role.create": "features.dashboard.action.roleCreate",
  "role.update": "features.dashboard.action.roleUpdate",
  "menu.update": "features.dashboard.action.menuUpdate",
  "dept.create": "features.dashboard.action.deptCreate",
  "dept.update": "features.dashboard.action.deptUpdate",
  "dept.sort": "features.dashboard.action.deptSort",
  "post.create": "features.dashboard.action.postCreate",
  "post.update": "features.dashboard.action.postUpdate",
  "notice.create": "features.dashboard.action.noticeCreate",
  "notice.update": "features.dashboard.action.noticeUpdate",
  "notice.withdraw": "features.dashboard.action.noticeWithdraw",
  "notice.remind": "features.dashboard.action.noticeRemind",
  "log.delete": "features.dashboard.action.logDelete",
  "login.success": "features.dashboard.action.loginSuccess",
  "login.success.demo": "features.dashboard.action.loginDemo",
  logout: "features.dashboard.action.logout",
};

defineProps<{
  items: StatsLogItem[];
  /** 卡头「查看全部」出口路径（页面按菜单可见性判定后传入；缺省不渲染） */
  viewAllTo?: string;
}>();

const { t, locale } = useI18n();

function nameOf(item: StatsLogItem): string {
  return (
    item.displayName ?? item.username ?? t("features.dashboard.activity.system")
  );
}
</script>

<template>
  <UCard class="dashboard-card h-full">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <span
          class="text-highlighted flex items-center gap-2 text-base font-semibold"
        >
          <UIcon
            aria-hidden
            class="text-primary size-4"
            name="i-lucide-activity"
          />
          {{ t("features.dashboard.activity.title") }}
        </span>
        <UButton
          v-if="viewAllTo"
          :label="t('features.dashboard.activity.viewAll')"
          size="sm"
          :to="viewAllTo"
          variant="ghost"
        />
      </div>
    </template>

    <div class="flex flex-col gap-1">
      <UEmpty
        v-if="items.length === 0"
        icon="i-lucide-inbox"
        size="sm"
        :title="t('features.dashboard.activity.empty')"
        variant="naked"
      />
      <template v-else>
        <div
          v-for="item in items"
          :key="item.id"
          class="hover:bg-elevated flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
        >
          <!-- key 随 avatar 变化重建子树：图片加载状态卸载后不重置，
               避免头像加载失败后 fallback 不回显（同 UserInfo 口径） -->
          <UAvatar
            :key="item.avatar ?? 'fallback'"
            :alt="nameOf(item)"
            :src="item.avatar ?? undefined"
            :text="nameOf(item).slice(0, 1)"
            class="shrink-0"
            size="sm"
          />
          <p class="min-w-0 flex-1 truncate text-sm">
            <span class="text-default font-medium">{{ nameOf(item) }}</span>
            <span v-if="ACTION_I18N[item.action]" class="text-muted ml-1.5">
              {{ t(ACTION_I18N[item.action]) }}
            </span>
            <span v-else class="text-muted ml-1.5 font-mono text-xs">
              {{ item.action }}
            </span>
          </p>
          <time
            class="text-muted shrink-0 text-xs tabular-nums"
            :datetime="item.createdAt"
          >
            {{ formatRelativeTime(item.createdAt, locale) }}
          </time>
        </div>
      </template>
    </div>
  </UCard>
</template>
