<script setup lang="ts">
import type {
  Notice,
  NoticeReadStatEntry,
  NoticeStatus,
} from "@/lib/api-types";

import { computed, h, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import {
  fetchNoticeDetail,
  fetchNoticeReadStats,
  getNoticeErrorMessage,
  remindNotice,
} from "./notice-api";
import { sanitizeNoticeHtml } from "./sanitize";
import { dictItemsQueryKey, fetchDictItems } from "@/features/dicts/dict-api";

import Spinner from "@/components/ui/spinner/index.vue";
import { useMenuPermissions } from "@/composables/use-permissions";
import { formatDateTime } from "@/lib/format-date";

/**
 * 公告详情抽屉（管理侧，契约 v1.7.0，对应 React 端 notice-detail-drawer.tsx）：
 * 公告信息 + 富文本内容（DOMPurify 消毒渲染）+ 已读率 + 已读/未读 Tab
 * （分页名单）+ 一键催办（24h 防频由后端 409 拦截）。
 *
 * 详情数据由抽屉内部按 id 拉取（列表行 Notice 不含 content/scopes，
 * 不能强转渲染）；同时把真实详情写入 ["notices","detail",id] 缓存，
 * 与编辑弹窗（同 key）共享，保证「先看详情再编辑」回填一致。
 */
const props = defineProps<{
  open: boolean;
  /** 目标公告（列表行 Notice 即可；完整详情由内部拉取，未返回前行数据兜底渲染） */
  notice: Notice | null;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

const { t, locale } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const { canEdit } = useMenuPermissions();

// 详情：抽屉打开时按 id 拉取完整数据（含 content/scopes/readCount 等）
const detailQuery = useQuery({
  queryKey: computed(() => ["notices", "detail", props.notice?.id ?? ""]),
  queryFn: () => fetchNoticeDetail(props.notice!.id),
  enabled: computed(() => Boolean(props.notice) && props.open),
  staleTime: 0,
});
const detail = computed<Notice | null>(
  () => detailQuery.data.value ?? props.notice,
);

// 正文 DOMPurify 消毒按内容 computed：抽屉任意重渲染（名单查询/主题切换等）
// 不重复对整篇富文本做全文解析
const sanitizedContent = computed(() =>
  sanitizeNoticeHtml(detail.value?.content ?? ""),
);

const readTab = ref<"read" | "unread">("unread");
const readPage = ref(1);
const unreadPage = ref(1);

const READ_STATS_STALE_MS = 60_000;
const READ_STATS_PAGE_SIZE = 10;

// 切换公告时重置名单页码：页码在 queryKey 中，沿用上一公告翻到的
// 第 N 页会使新公告从中间页查询（名单误显为空）
watch(
  () => props.notice?.id,
  () => {
    readPage.value = 1;
    unreadPage.value = 1;
  },
);

// 已读 / 未读名单分别独立查询：queryKey 各自固定（只含自身页码），
// 切换 Tab 仅切换取哪个查询的数据，不触发另一 Tab 重新请求
const readStatsQuery = useQuery({
  queryKey: computed(() => [
    "notices",
    "read-stats",
    props.notice?.id ?? "",
    "read",
    readPage.value,
  ]),
  queryFn: () =>
    fetchNoticeReadStats(
      props.notice!.id,
      "read",
      readPage.value,
      READ_STATS_PAGE_SIZE,
    ),
  enabled: computed(() => Boolean(props.notice) && props.open),
  placeholderData: keepPreviousData,
  staleTime: READ_STATS_STALE_MS,
});
const unreadStatsQuery = useQuery({
  queryKey: computed(() => [
    "notices",
    "read-stats",
    props.notice?.id ?? "",
    "unread",
    unreadPage.value,
  ]),
  queryFn: () =>
    fetchNoticeReadStats(
      props.notice!.id,
      "unread",
      unreadPage.value,
      READ_STATS_PAGE_SIZE,
    ),
  enabled: computed(() => Boolean(props.notice) && props.open),
  placeholderData: keepPreviousData,
  staleTime: READ_STATS_STALE_MS,
});

const activeStats = computed(() =>
  readTab.value === "read" ? readStatsQuery : unreadStatsQuery,
);
const entries = computed<NoticeReadStatEntry[]>(
  () => activeStats.value.data.value?.data ?? [],
);
const statsLoading = computed(() => activeStats.value.isLoading.value);
const statsPagination = computed(
  () => activeStats.value.data.value?.pagination,
);

function loadMore() {
  if (readTab.value === "read") {
    readPage.value += 1;
  } else {
    unreadPage.value += 1;
  }
}

const remindMutation = useMutation({
  mutationFn: () => remindNotice(props.notice!.id),
  onSuccess: () => {
    // 催办后未读名单与统计刷新（提示反馈由 handleRemind 的 toast 三段式呈现）
    void queryClient.invalidateQueries({
      queryKey: ["notices", "read-stats", props.notice?.id ?? ""],
    });
  },
});

async function handleRemind() {
  const remindingToast = toast.add({
    title: t("features.notices.detail.reminding"),
    icon: hSpinner(),
    color: "info",
    duration: 0,
  });

  try {
    const result = await remindMutation.mutateAsync();

    toast.update(remindingToast.id, {
      title: t("features.notices.detail.remindSuccess", {
        count: result.remindedCount,
      }),
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    toast.update(remindingToast.id, {
      title: getNoticeErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
    });
  }
}

// h 已在顶部导入；Spinner 作为 toast icon（自带旋转动画）
function hSpinner() {
  return h(Spinner, { size: "sm", class: "mt-0.5" });
}

// 公告状态文案走字典（notice_status，字典管理可维护）
const statusDictQuery = useQuery({
  queryKey: dictItemsQueryKey("notice_status"),
  queryFn: () => fetchDictItems("notice_status"),
  staleTime: 60_000,
});

function statusLabel(value: NoticeStatus): string {
  const item = (statusDictQuery.data.value ?? []).find(
    (d) => d.value === value,
  );

  return item ? (item.i18nKey ? t(item.i18nKey) : item.label) : value;
}

const statusColor = computed(() => {
  const status = detail.value?.status;

  return status === "published"
    ? "success"
    : status === "draft"
      ? "neutral"
      : "error";
});

const readRatePercent = computed(() => {
  const rate = detail.value?.readRate;

  return rate === null || rate === undefined ? null : Math.round(rate);
});

const tabItems = computed(() => [
  { label: t("features.notices.detail.unreadTab"), value: "unread" },
  { label: t("features.notices.detail.readTab"), value: "read" },
]);

const publisherText = computed(() =>
  detail.value
    ? t("features.notices.detail.publisher", {
        name: detail.value.publisherName ?? "—",
        time: formatDateTime(detail.value.publishTime, locale.value),
      })
    : "",
);

function close() {
  emit("update:open", false);
}
</script>

<script lang="ts">
export default { name: "NoticeDetailDrawer" };
</script>

<template>
  <USlideover
    :open="open"
    :ui="{ content: 'w-140 max-w-[85vw]' }"
    :title="detail?.title ?? t('features.notices.detail.titleFallback')"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <div v-if="detail" class="flex flex-col gap-4">
        <!-- 公告信息 -->
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            v-if="detail.isTop"
            :label="t('features.notices.status.top')"
            color="warning"
            variant="soft"
          />
          <UBadge
            :color="statusColor"
            :label="statusLabel(detail.status)"
            variant="soft"
          />
          <span class="text-muted text-xs">
            {{ publisherText }}
          </span>
        </div>

        <!-- 已读率 -->
        <div
          class="border-default flex flex-col gap-1 rounded-lg border px-3 py-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted text-xs">
              {{ t("features.notices.detail.readRate") }}
            </span>
            <span class="text-xs">
              {{
                readRatePercent === null
                  ? "—"
                  : `${readRatePercent}%（${detail.readCount}/${detail.totalCount}）`
              }}
            </span>
          </div>
          <UProgress
            v-if="readRatePercent !== null"
            :aria-label="t('features.notices.detail.readRate')"
            :model-value="readRatePercent"
            size="sm"
          />
        </div>

        <!-- 富文本内容（DOMPurify 消毒渲染，阻断存储型 XSS） -->
        <div
          v-if="detailQuery.isLoading.value"
          aria-hidden
          class="border-default flex flex-col gap-2 rounded-lg border px-4 py-3"
        >
          <USkeleton class="h-4 w-3/4 rounded-md" />
          <USkeleton class="h-4 w-full rounded-md" />
          <USkeleton class="h-4 w-5/6 rounded-md" />
          <USkeleton class="h-4 w-2/3 rounded-md" />
        </div>
        <!-- 内容来自 Tiptap 编辑并经 DOMPurify 消毒（sanitizeNoticeHtml），
             v-html 为消毒后富文本的必要渲染方式（对齐 React dangerouslySetInnerHTML） -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-else
          class="prose-notice border-default max-h-96 overflow-y-auto rounded-lg border px-4 py-3 text-sm"
          v-html="sanitizedContent"
        />

        <!-- eslint-enable vue/no-v-html -->

        <!-- 已读/未读 Tab -->
        <UTabs
          v-model:model-value="readTab"
          :content="false"
          :items="tabItems"
          size="sm"
        />

        <div class="flex min-h-40 flex-col gap-1">
          <!-- 骨架屏：与名单行同形（头像圆 + 双行文本） -->
          <div v-if="statsLoading" aria-hidden class="flex flex-col gap-2">
            <div
              v-for="index in 4"
              :key="index"
              class="flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <USkeleton class="size-8 rounded-full" />
              <div class="flex flex-1 flex-col gap-1">
                <USkeleton class="h-3 w-24 rounded-md" />
                <USkeleton class="h-2.5 w-32 rounded-md" />
              </div>
              <USkeleton class="h-2.5 w-20 rounded-md" />
            </div>
          </div>
          <p
            v-else-if="entries.length === 0"
            class="text-muted py-8 text-center text-sm"
          >
            {{ t("features.notices.detail.emptyMembers") }}
          </p>
          <template v-else>
            <div
              v-for="entry in entries"
              :key="entry.userId"
              class="flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <UAvatar
                :alt="entry.displayName"
                :src="entry.avatar ?? undefined"
                :text="entry.displayName.slice(0, 1)"
                class="shrink-0"
                size="sm"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ entry.displayName }}
                </p>
                <p class="text-muted truncate text-xs">
                  {{ entry.deptPath ?? entry.username }}
                </p>
              </div>
              <span class="text-muted shrink-0 text-xs">
                {{ entry.readAt ? formatDateTime(entry.readAt, locale) : "—" }}
              </span>
            </div>
          </template>
        </div>

        <UButton
          v-if="
            statsPagination && statsPagination.total > statsPagination.pageSize
          "
          :label="t('features.notices.detail.loadMore')"
          block
          size="sm"
          variant="outline"
          @click="loadMore"
        />

        <UButton
          v-if="readTab === 'unread' && canEdit"
          :disabled="
            !detail || detail.status !== 'published' || entries.length === 0
          "
          :icon="
            remindMutation.isPending.value ? undefined : 'i-lucide-bell-ring'
          "
          :label="
            remindMutation.isPending.value
              ? t('features.notices.detail.reminding')
              : t('features.notices.detail.remind')
          "
          :loading="remindMutation.isPending.value"
          block
          variant="outline"
          @click="handleRemind"
        />
      </div>
      <p v-else class="text-muted text-sm">
        {{ t("features.notices.detail.titleFallback") }}
      </p>
    </template>

    <template #footer>
      <UButton
        :label="t('common.close')"
        class="w-full justify-center"
        @click="close"
      />
    </template>
  </USlideover>
</template>
