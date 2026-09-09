<script setup lang="ts">
import type { AppNotification } from "@/lib/api-types";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import {
  fetchNotifications,
  fetchUnreadCount,
  readAllNotifications,
  readNotification,
} from "@/features/notice/notification-api";

import { formatRelativeTime } from "@/lib/format-date";

/**
 * 顶栏通知铃铛（契约 v1.7.0 站内信，对应 React 端 notice-bell.tsx）：
 * - 未读数经 useQuery refetchInterval 60s 轮询（红点角标，0 条不显示）；
 * - 抽屉面板展示通知列表（最新在前），固定「未读 / 全部」筛选 Tabs，
 *   点击条目标记已读并跳转 link（无 link 仅记已读）；
 * - 「全部已读」一键清零；「我的公告」入口。
 */
const { t, locale } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();
const toast = useToast();

const isOpen = ref(false);
const activeTab = ref<"unread" | "all">("unread");
const openingMyNotices = ref(false);

const unreadQuery = useQuery({
  queryKey: ["notifications", "unread-count"],
  queryFn: fetchUnreadCount,
  refetchInterval: 60_000,
  staleTime: 30_000,
});
const unreadCount = computed(() => unreadQuery.data.value?.count ?? 0);

const listQuery = useQuery({
  queryKey: computed(() => ["notifications", "list", activeTab.value]),
  queryFn: () =>
    fetchNotifications({
      page: 1,
      pageSize: 20,
      unreadOnly: activeTab.value === "unread",
    }),
  enabled: computed(() => isOpen.value),
  staleTime: 0,
});
const notifications = computed<AppNotification[]>(
  () => listQuery.data.value?.data ?? [],
);
const listTotal = computed(() => listQuery.data.value?.pagination.total ?? 0);
// isPending（而非 isLoading）：抽屉未开时 query 处于 disabled 的 pending 态，
// 用 isLoading 会在打开抽屉首帧闪现空态，isPending 才稳定呈现骨架屏
const listPending = computed(() => listQuery.status.value === "pending");

const emptyTitle = computed(() =>
  activeTab.value === "unread"
    ? t("layout.header.noUnreadNotifications")
    : t("layout.header.noNotifications"),
);

function invalidateNotifications() {
  void queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

const readAllMutation = useMutation({
  mutationFn: readAllNotifications,
  onSuccess: () => invalidateNotifications(),
  onError: () => {
    toast.add({ color: "error", title: t("common.loadError") });
  },
});

const readOneMutation = useMutation({
  mutationFn: readNotification,
  onSuccess: () => invalidateNotifications(),
});

function handleItemClick(notification: AppNotification) {
  // 标记已读后跳转（跳转即可读，失败静默）
  readOneMutation.mutate(notification.id);

  if (notification.link) {
    isOpen.value = false;
    void router.push(notification.link);
  }
}

function openBell() {
  activeTab.value = "unread";
  isOpen.value = true;
}

async function openMyNotices() {
  openingMyNotices.value = true;
  isOpen.value = false;

  try {
    await router.push("/my-notices");
  } finally {
    openingMyNotices.value = false;
  }
}

const tabItems = computed(() => [
  { label: t("layout.header.unreadTab"), value: "unread" },
  { label: t("layout.header.allTab"), value: "all" },
]);

/** 通知类型 → 图标（装饰性，aria-hidden） */
const NOTIFICATION_ICONS: Record<AppNotification["type"], string> = {
  notice_publish: "i-lucide-bell-ring",
  notice_remind: "i-lucide-alarm-clock",
  system: "i-lucide-settings",
};

const bellAriaLabel = computed(() =>
  unreadCount.value > 0
    ? `${t("layout.header.notifications")} (${unreadCount.value})`
    : t("layout.header.notifications"),
);
</script>

<script lang="ts">
export default { name: "NoticeBell" };
</script>

<template>
  <div>
    <!-- 铃铛按钮 + 未读红点角标（0 条不显示） -->
    <UChip
      :color="unreadCount > 0 ? 'error' : 'neutral'"
      :show="unreadCount > 0"
      :text="unreadCount > 99 ? '99+' : String(unreadCount)"
      size="3xl"
    >
      <UButton
        :aria-label="bellAriaLabel"
        color="neutral"
        icon="i-lucide-bell"
        size="sm"
        variant="ghost"
        @click="openBell"
      />
    </UChip>

    <USlideover
      :open="isOpen"
      :ui="{ content: 'w-100 max-w-[85vw]' }"
      :title="t('layout.header.notifications')"
      @update:open="(value: boolean) => (isOpen = value)"
    >
      <template #body>
        <!-- Tabs 仅作「未读 / 全部」筛选器（列表为单一视图，切换只重发查询） -->
        <UTabs
          v-model:model-value="activeTab"
          :content="false"
          :items="tabItems"
          size="sm"
        />

        <div class="mt-3 flex min-h-40 flex-col">
          <!-- 逼真骨架屏：与通知条目同形（图标 + 标题/时间行 + 通栏摘要两行） -->
          <div
            v-if="listPending"
            aria-hidden
            class="divide-default flex flex-col divide-y"
          >
            <div v-for="index in 5" :key="index" class="px-1 py-3">
              <div class="flex w-full items-center gap-3">
                <USkeleton class="size-9 shrink-0 rounded-full" />
                <div
                  class="flex min-w-0 flex-1 items-center justify-between gap-2"
                >
                  <USkeleton
                    class="h-3.5 rounded-md"
                    :style="{ width: `${60 - (index % 3) * 8}%` }"
                  />
                  <USkeleton class="h-2.5 w-12 shrink-0 rounded-md" />
                </div>
              </div>
              <div class="mt-2 flex flex-col gap-1.5">
                <USkeleton class="h-2.5 w-[92%] rounded-md" />
                <USkeleton
                  class="h-2.5 rounded-md"
                  :style="{ width: `${64 - (index % 3) * 10}%` }"
                />
              </div>
            </div>
          </div>

          <p
            v-else-if="notifications.length === 0"
            class="text-muted py-10 text-center text-sm"
          >
            {{ emptyTitle }}
          </p>

          <ul v-else class="divide-default divide-y">
            <li v-for="notification in notifications" :key="notification.id">
              <button
                class="w-full rounded-lg px-1 py-3 text-start transition-colors hover:bg-elevated/60"
                type="button"
                @click="handleItemClick(notification)"
              >
                <div class="flex w-full min-w-0 flex-col gap-1.5">
                  <div class="flex w-full items-center gap-3">
                    <span
                      class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full"
                    >
                      <UIcon
                        :name="
                          NOTIFICATION_ICONS[notification.type] ??
                          'i-lucide-bell'
                        "
                        aria-hidden
                        class="size-4"
                      />
                    </span>
                    <!-- 未读状态不能只靠视觉红点传达，SR 补播报 -->
                    <span
                      class="min-w-0 flex-1 truncate text-sm"
                      :class="{ 'font-medium': notification.readAt === null }"
                    >
                      {{ notification.title }}
                    </span>
                    <span v-if="notification.readAt === null" class="sr-only">
                      {{ t("features.myNotices.filter.unread") }}
                    </span>
                    <span
                      v-if="notification.readAt === null"
                      aria-hidden
                      class="bg-error size-2 shrink-0 rounded-full"
                    />
                    <span class="text-muted shrink-0 text-xs">
                      {{ formatRelativeTime(notification.createdAt, locale) }}
                    </span>
                  </div>
                  <span
                    v-if="notification.content"
                    class="text-muted line-clamp-2 text-xs"
                  >
                    {{ notification.content }}
                  </span>
                </div>
              </button>
            </li>
          </ul>

          <p
            v-if="listTotal > notifications.length"
            class="text-muted pb-1 pt-2 text-center text-xs"
          >
            {{ t("layout.header.moreNotifications") }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="grid w-full grid-cols-2 gap-2">
          <UButton
            :disabled="unreadCount === 0 || openingMyNotices"
            :label="t('layout.header.readAll')"
            :loading="readAllMutation.isPending.value"
            block
            variant="outline"
            @click="readAllMutation.mutate()"
          />
          <UButton
            :disabled="readAllMutation.isPending.value"
            :label="t('layout.header.viewMyNotices')"
            :loading="openingMyNotices"
            block
            @click="openMyNotices"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>
