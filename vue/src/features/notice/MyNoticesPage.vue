<script setup lang="ts">
import type { Notice } from "@/lib/api-types";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import { fetchNoticeDetail } from "./notice-api";
import { sanitizeNoticeHtml } from "./sanitize";

import ErrorContent from "@/components/common/ErrorContent.vue";
import UserInfo from "@/components/common/UserInfo.vue";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";
import { formatDateTime, formatRelativeTime } from "@/lib/format-date";

/**
 * 我的公告页（全员消费端，对应 React 端 my-notices-page.tsx）：
 * 双栏布局——左列表（阅读态筛选 + 搜索 + 简易翻页）+ 右详情
 * （富文本 DOMPurify 消毒渲染）。
 *
 * - 选中公告由 URL ?noticeId= 驱动（分享 / 刷新 / 前进后退稳定）：
 *   未选中时自动落在第一条（列表变化后回写 URL）；显式关闭（X）后
 *   不再自动选中，直到 URL 再次携带 noticeId；
 * - 进详情服务端自动记首读，myReadAt 首次出现即失效列表与站内信
 *   未读数缓存（未读点/红点即时消隐）；
 * - KeepAlive 转场守卫：路由已不在本页时忽略一切 URL 回写（Vue 端
 *   对应口径为 route.path 判断）。
 */

type MyNoticeReadStatus = "all" | "read" | "unread";

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const myNoticesListStore = createListStore<{ readStatus: MyNoticeReadStatus }>({
  readStatus: "all",
});

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const toast = useToast();

const store = myNoticesListStore;

const isDetailClosed = ref(false);

const {
  data: notices,
  pagination,
  isLoading,
  isFetching,
} = useListQuery<Notice, { readStatus: MyNoticeReadStatus }>({
  store,
  queryKeyPrefix: ["my-notices"],
  path: "/notices/mine",
  searchParam: "keyword",
  buildFilters: (f) =>
    f.readStatus === "all" ? {} : { readStatus: f.readStatus },
});

const searchInput = ref(store.search);

// 生效搜索词变化（如重置）时同步输入框
watch(
  () => store.search,
  (value) => {
    searchInput.value = value;
  },
);

function applySearch() {
  store.setSearch(searchInput.value.trim());
}

function clearSearch() {
  searchInput.value = "";
  store.setSearch("");
}

// URL ?noticeId= ↔ 选中公告（KeepAlive 转场守卫：路由不在本页时不回写）
const urlNoticeId = computed<string | null>(() => {
  const value = route.query.noticeId;

  return typeof value === "string" && value !== "" ? value : null;
});

function updateSelectedNotice(noticeId: string | null) {
  if (route.path !== "/my-notices") return;

  isDetailClosed.value = noticeId === null;
  void router.replace({
    query: { ...route.query, noticeId: noticeId ?? undefined },
  });
}

watch(urlNoticeId, (value) => {
  if (value) isDetailClosed.value = false;
});

// 选中派生：URL 指定的公告在当前列表中 → 用它；显式关闭 → 不选；
// 否则自动落在第一条
const selectedNoticeId = computed<string | null>(() => {
  const list = notices.value;

  if (
    urlNoticeId.value &&
    list.some((notice) => notice.id === urlNoticeId.value)
  ) {
    return urlNoticeId.value;
  }

  if (isDetailClosed.value) {
    return null;
  }

  return list[0]?.id ?? null;
});

// 列表变化后自动选中回写 URL（URL 指定的公告不在列表中则清掉）
watch(
  [() => notices.value.length, selectedNoticeId, urlNoticeId],
  ([length, selected, urlId]) => {
    if (length === 0) {
      if (urlId) updateSelectedNotice(null);

      return;
    }
    if (!selected) return;
    if (selected !== urlId) updateSelectedNotice(selected);
  },
);

const selectedNotice = computed(
  () =>
    notices.value.find((notice) => notice.id === selectedNoticeId.value) ??
    null,
);

const detailQuery = useQuery({
  queryKey: computed(() => ["notices", "detail", selectedNoticeId.value]),
  queryFn: () => fetchNoticeDetail(selectedNoticeId.value ?? ""),
  enabled: computed(() => Boolean(selectedNoticeId.value)),
  staleTime: 0,
});

// 正文 DOMPurify 消毒按内容 computed：详情任意重渲染不重复全文解析
const sanitizedContent = computed(() =>
  sanitizeNoticeHtml(detailQuery.data.value?.content ?? ""),
);

// 首读生效后失效列表（未读点消隐）与站内信未读数（红点即时消隐）
watch(
  () => detailQuery.data.value?.myReadAt,
  (myReadAt) => {
    if (
      !selectedNoticeId.value ||
      !myReadAt ||
      selectedNotice.value?.myReadAt
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["my-notices"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  },
);

const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(
      (pagination.value.total || 0) / Math.max(pagination.value.pageSize, 1),
    ),
  ),
);
const canPrev = computed(() => pagination.value.page > 1);
const canNext = computed(() => pagination.value.page < totalPages.value);

const currentIndex = computed(() =>
  selectedNoticeId.value
    ? notices.value.findIndex((notice) => notice.id === selectedNoticeId.value)
    : -1,
);
const prevNoticeId = computed(() =>
  currentIndex.value > 0
    ? (notices.value[currentIndex.value - 1]?.id ?? null)
    : null,
);
const nextNoticeId = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < notices.value.length - 1
    ? (notices.value[currentIndex.value + 1]?.id ?? null)
    : null,
);

const readStatusOptions = computed(() => [
  { label: t("features.myNotices.filter.all"), value: "all" },
  { label: t("features.myNotices.filter.unread"), value: "unread" },
  { label: t("features.myNotices.filter.read"), value: "read" },
]);

const emptyDescription = computed(() => {
  const status = store.filters.readStatus;

  return status === "unread"
    ? t("features.myNotices.empty.unread")
    : status === "read"
      ? t("features.myNotices.empty.read")
      : store.search
        ? t("features.myNotices.empty.search")
        : t("features.myNotices.empty.all");
});

function publisherOf(notice: Notice) {
  return notice.publisherId && notice.publisherName
    ? {
        username: notice.publisherName,
        displayName: notice.publisherName,
        email: notice.publisherEmail,
        avatar: notice.publisherAvatar,
      }
    : null;
}

function onErrorRetry() {
  toast.add({ color: "info", title: t("common.loading") });
  void detailQuery.refetch();
}
</script>

<script lang="ts">
export default { name: "MyNoticesPage" };
</script>

<template>
  <div
    class="bg-default flex h-full min-h-0 flex-col overflow-hidden lg:flex-row"
  >
    <!-- 左栏：列表 -->
    <div
      class="border-default bg-default flex h-[44%] min-h-80 flex-col border-b lg:h-full lg:w-90 lg:min-w-90 lg:border-r lg:border-b-0"
    >
      <!-- 搜索 / 筛选 / 翻页刷新中：进度条定位在本区下边框处，不产生布局位移 -->
      <div class="border-default relative shrink-0 border-b p-3.5">
        <div class="flex items-center gap-2">
          <USelect
            :aria-label="t('features.myNotices.filter.readStatus')"
            :items="readStatusOptions"
            :model-value="store.filters.readStatus"
            class="w-32 shrink-0"
            size="sm"
            value-key="value"
            @update:model-value="
              (value: unknown) =>
                store.setFilters({
                  readStatus: (value ?? 'all') as MyNoticeReadStatus,
                })
            "
          />
          <UInput
            v-model="searchInput"
            :aria-label="t('features.myNotices.search.placeholder')"
            :placeholder="t('features.myNotices.search.placeholder')"
            class="min-w-0 flex-1"
            icon="i-lucide-search"
            size="sm"
            @keyup.enter="applySearch"
          >
            <template v-if="searchInput" #trailing>
              <UButton
                :aria-label="t('common.reset')"
                class="p-0.5"
                color="neutral"
                icon="i-lucide-x"
                size="sm"
                variant="ghost"
                @click="clearSearch"
              />
            </template>
          </UInput>
        </div>

        <div
          v-if="isFetching && !isLoading"
          class="bg-primary absolute inset-x-0 bottom-0 h-px animate-pulse"
          :aria-label="t('common.loading')"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <!-- 列表骨架屏：与列表行同形（头像圆 + 双行文本 + 时间条） -->
        <div
          v-if="isLoading"
          aria-hidden
          class="divide-default flex flex-col divide-y"
        >
          <div v-for="index in 5" :key="index" class="px-4 py-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3">
                <USkeleton class="size-9 rounded-full" />
                <div class="flex flex-col gap-1.5">
                  <USkeleton class="h-4 w-24 rounded-md" />
                  <USkeleton class="h-3 w-32 rounded-md" />
                </div>
              </div>
              <USkeleton class="h-3 w-16 rounded-md" />
            </div>
            <USkeleton class="mt-3 h-4 w-5/6 rounded-md" />
            <USkeleton class="mt-2 h-3 w-2/3 rounded-md" />
          </div>
        </div>

        <div
          v-else-if="notices.length === 0"
          class="flex h-full items-center justify-center px-6 py-10"
        >
          <div class="text-muted flex flex-col items-center gap-2 text-center">
            <UIcon class="size-8" name="i-lucide-bell-ring" />
            <p class="text-sm font-medium">
              {{ t("features.myNotices.empty.title") }}
            </p>
            <p class="text-xs">{{ emptyDescription }}</p>
          </div>
        </div>

        <ul v-else class="divide-default w-full divide-y">
          <li v-for="notice in notices" :key="notice.id">
            <button
              :class="[
                'w-full border-l-2 px-4 py-4 text-start transition-all duration-200',
                notice.id === selectedNoticeId
                  ? 'border-l-primary bg-primary/10'
                  : 'border-l-transparent hover:bg-elevated/50',
              ]"
              :aria-current="notice.id === selectedNoticeId"
              type="button"
              @click="updateSelectedNotice(notice.id)"
            >
              <div class="flex w-full min-w-0 flex-col gap-2.5">
                <div class="flex items-center justify-between gap-3">
                  <!-- 发布人被删除（publisherId 置空）时整体占位 -->
                  <UserInfo
                    v-if="publisherOf(notice)"
                    :user="publisherOf(notice)!"
                    class="min-w-0 flex-1"
                  />
                  <span v-else class="text-muted text-sm">—</span>
                  <div class="flex shrink-0 items-center gap-2">
                    <span
                      v-if="!notice.myReadAt"
                      aria-hidden
                      class="bg-primary size-2 rounded-full"
                    />
                    <span class="text-muted text-xs">
                      {{ formatRelativeTime(notice.publishTime, locale) }}
                    </span>
                  </div>
                </div>

                <p
                  :class="[
                    'line-clamp-2 leading-6 text-sm',
                    notice.myReadAt ? 'font-medium' : 'font-semibold',
                  ]"
                >
                  {{ notice.title }}
                </p>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-muted line-clamp-1 text-xs">
                    {{
                      notice.myReadAt
                        ? t("features.myNotices.status.readAt", {
                            time: formatDateTime(notice.myReadAt, locale),
                          })
                        : t("features.myNotices.status.unreadHint")
                    }}
                  </span>
                  <UBadge
                    v-if="notice.isTop"
                    :label="t('features.notices.status.top')"
                    class="shrink-0"
                    color="warning"
                    size="sm"
                    variant="soft"
                  />
                </div>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <div
        class="border-default flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3"
      >
        <span class="text-muted text-xs">
          {{
            t("features.myNotices.pagination", {
              page: pagination.page,
              total: totalPages,
            })
          }}
        </span>
        <div class="flex items-center gap-2">
          <UButton
            :aria-label="t('features.myNotices.paginationPrev')"
            :disabled="!canPrev || isFetching"
            color="neutral"
            icon="i-lucide-arrow-left"
            size="sm"
            variant="ghost"
            @click="store.setPage(store.page - 1)"
          />
          <UButton
            :aria-label="t('features.myNotices.paginationNext')"
            :disabled="!canNext || isFetching"
            color="neutral"
            icon="i-lucide-arrow-right"
            size="sm"
            variant="ghost"
            @click="store.setPage(store.page + 1)"
          />
        </div>
      </div>
    </div>

    <!-- 右栏：详情 -->
    <div class="bg-default min-h-0 min-w-0 flex-1">
      <div
        v-if="!selectedNoticeId"
        class="text-muted flex h-full items-center justify-center px-6 py-10"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <UIcon class="size-8" name="i-lucide-search" />
          <p class="text-sm font-medium">
            {{ t("features.myNotices.empty.selectTitle") }}
          </p>
          <p class="text-xs">
            {{ t("features.myNotices.empty.selectHint") }}
          </p>
        </div>
      </div>

      <!-- 详情骨架屏：对齐 React 端 NoticeDetailSkeleton 结构 -->
      <div
        v-else-if="detailQuery.isLoading.value"
        aria-hidden
        class="flex h-full min-h-0 flex-col"
      >
        <div class="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <USkeleton class="size-8 rounded-full" />
            <USkeleton class="h-5 w-64 rounded-md" />
          </div>
          <div class="flex items-center gap-2">
            <USkeleton class="h-8 w-20 rounded-full" />
            <USkeleton class="h-8 w-20 rounded-full" />
          </div>
        </div>
        <USeparator />
        <div class="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <USkeleton class="size-10 rounded-full" />
            <div class="flex flex-col gap-1.5">
              <USkeleton class="h-4 w-28 rounded-md" />
              <USkeleton class="h-3 w-44 rounded-md" />
            </div>
          </div>
          <USkeleton class="h-3 w-16 rounded-md" />
        </div>
        <USeparator />
        <div class="flex-1 px-5 py-5 md:px-6">
          <div class="flex flex-col gap-3">
            <USkeleton class="h-4 w-3/4 rounded-md" />
            <USkeleton class="h-4 w-full rounded-md" />
            <USkeleton class="h-4 w-5/6 rounded-md" />
            <USkeleton class="h-4 w-2/3 rounded-md" />
            <USkeleton class="mt-3 h-4 w-full rounded-md" />
            <USkeleton class="h-4 w-11/12 rounded-md" />
            <USkeleton class="h-4 w-4/5 rounded-md" />
          </div>
        </div>
      </div>

      <div
        v-else-if="detailQuery.isError.value || !detailQuery.data.value"
        class="flex h-full items-center justify-center px-6 py-10"
      >
        <ErrorContent
          :description="t('features.notices.detail.notVisible')"
          :retry-label="t('common.retry')"
          :title="t('features.notices.detail.notVisibleTitle')"
          @retry="onErrorRetry"
        />
      </div>

      <div v-else class="flex h-full min-h-0 flex-col">
        <div class="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
          <div class="flex min-w-0 items-center gap-2">
            <UButton
              :aria-label="t('common.close')"
              class="shrink-0"
              color="neutral"
              icon="i-lucide-x"
              size="sm"
              variant="ghost"
              @click="updateSelectedNotice(null)"
            />
            <h2 class="flex-1 truncate text-lg font-semibold">
              {{ detailQuery.data.value!.title }}
            </h2>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <UButton
              :disabled="!prevNoticeId"
              icon="i-lucide-arrow-left"
              size="sm"
              variant="outline"
              @click="updateSelectedNotice(prevNoticeId)"
            >
              {{ t("features.myNotices.detail.prev") }}
            </UButton>
            <UButton
              :disabled="!nextNoticeId"
              size="sm"
              trailing-icon="i-lucide-arrow-right"
              variant="outline"
              @click="updateSelectedNotice(nextNoticeId)"
            >
              {{ t("features.myNotices.detail.next") }}
            </UButton>
          </div>
        </div>

        <USeparator />

        <div class="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
          <UserInfo
            v-if="publisherOf(detailQuery.data.value!)"
            :user="publisherOf(detailQuery.data.value!)!"
            class="min-w-0 flex-1"
          />
          <span v-else class="text-muted text-sm">—</span>
          <span class="text-muted shrink-0 text-right text-xs">
            {{
              formatRelativeTime(detailQuery.data.value!.publishTime, locale)
            }}
          </span>
        </div>

        <USeparator />

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <!-- 内容经 DOMPurify 消毒（sanitizeNoticeHtml）；空内容回退标题纯文本 -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="detailQuery.data.value!.content"
            class="prose-notice text-sm leading-7"
            v-html="sanitizedContent"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p v-else class="text-sm leading-7">
            {{ detailQuery.data.value!.title }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
