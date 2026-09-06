<script setup lang="ts">
import type { User } from "@/lib/api-types";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/vue-query";

import { fetchApiList } from "@/lib/api-client";
import UserInfo from "@/components/common/UserInfo.vue";

/**
 * 负责人选择器（对应 React 端 LeaderSelect）：
 * /users 分页下拉 + 滚动到底自动加载下一页。
 *
 * - 数据用 useInfiniteQuery 缓存（跨弹窗共享、staleTime 内开关弹窗不重复请求）；
 * - 编辑回显兜底：当前负责人不在已加载用户列表中时渲染为列表首条；
 * - 无权限（403）等加载失败：禁用选择器，不阻塞表单其余字段编辑。
 */
const props = defineProps<{
  /** 当前选中值（"" = 未选择） */
  modelValue: string;
  /** 编辑回显兜底候选（当前负责人不在已加载列表时显示） */
  currentLeader: { id: string; displayName: string } | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { t } = useI18n();

const LEADER_PAGE_SIZE = 50;

const usersQuery = useInfiniteQuery({
  queryKey: ["users", "leader-options"],
  queryFn: ({ pageParam }) =>
    fetchApiList<User>("/users", {
      page: pageParam,
      pageSize: LEADER_PAGE_SIZE,
    }),
  initialPageParam: 1,
  getNextPageParam: (lastPage, allPages) =>
    allPages.length * LEADER_PAGE_SIZE < lastPage.pagination.total
      ? allPages.length + 1
      : undefined,
  // 弹窗反复开关共享缓存：staleTime 内不发请求，过期后台 refetch 不打断交互
  staleTime: 60_000,
  placeholderData: keepPreviousData,
  retry: false,
});

const items = computed(() =>
  (usersQuery.data.value?.pages ?? []).flatMap((page) => page.data),
);
const failed = computed(() => usersQuery.isError.value);
const loading = computed(() => usersQuery.isLoading.value);
const loadingMore = computed(() => usersQuery.isFetchingNextPage.value);
const hasNextPage = computed(() => usersQuery.hasNextPage.value);

const currentLeaderVisible = computed(
  () =>
    !props.currentLeader ||
    items.value.some((user) => user.id === props.currentLeader!.id),
);

const selectedUser = computed(
  () => items.value.find((user) => user.id === props.modelValue) ?? null,
);

const placeholder = computed(() => {
  if (loading.value) return t("features.depts.form.leaderLoading");
  if (failed.value) return t("features.depts.form.leaderLoadFailed");
  if (items.value.length === 0 && !props.currentLeader) {
    return t("features.depts.form.leaderEmpty");
  }

  return t("features.depts.form.leaderPlaceholder");
});

const listOpen = ref(false);
const scrollRef = ref<HTMLElement | null>(null);

// 弹层每次打开回到顶部，避免停留在上一会话的滚动位置
watch(listOpen, (open) => {
  if (open) requestAnimationFrame(() => scrollRef.value?.scrollTo({ top: 0 }));
});

/** 滚动接近底部加载下一页（翻页中不重复触发） */
function onScroll(event: Event) {
  const el = event.target as HTMLElement;

  if (
    failed.value ||
    !hasNextPage.value ||
    loadingMore.value ||
    el.scrollTop + el.clientHeight < el.scrollHeight - 40
  ) {
    return;
  }

  void usersQuery.fetchNextPage();
}

function pick(user: User) {
  emit("update:modelValue", user.id);
  listOpen.value = false;
}

function clear() {
  emit("update:modelValue", "");
}
</script>

<script lang="ts">
export default { name: "DeptLeaderSelect" };
</script>

<template>
  <UFormField :label="t('features.depts.form.leader')" :disabled="failed">
    <UPopover
      v-model:open="listOpen"
      :content="{ align: 'start' }"
      :ui="{ content: 'w-(--upopover-width)' }"
    >
      <UButton
        :disabled="failed"
        class="w-full min-w-0 justify-start font-normal"
        color="neutral"
        variant="outline"
      >
        <span v-if="selectedUser" class="min-w-0 flex-1">
          <UserInfo :user="selectedUser" />
        </span>
        <span
          v-else-if="currentLeader && modelValue && !failed"
          class="min-w-0 flex-1 truncate text-sm"
        >
          {{ currentLeader.displayName }}
        </span>
        <span v-else class="text-muted min-w-0 flex-1 truncate text-sm">
          {{ placeholder }}
        </span>
        <UIcon
          class="size-4 shrink-0 text-muted"
          name="i-lucide-chevron-down"
        />
      </UButton>

      <template #content>
        <div
          :style="{ maxHeight: '16rem', overflowY: 'auto' }"
          @scroll="onScroll"
        >
          <div ref="scrollRef">
            <!-- 编辑回显兜底：当前负责人不在已加载用户列表中时渲染为首条 -->
            <button
              v-if="currentLeader && !currentLeaderVisible && modelValue"
              class="hover:bg-elevated/60 flex w-full items-center gap-2 px-3 py-2 text-start"
              type="button"
              @click="
                clear();
                listOpen = false;
              "
            >
              <span class="truncate text-sm">
                {{ currentLeader.displayName }}
              </span>
            </button>
            <button
              v-for="user in items"
              :key="user.id"
              :class="user.id === modelValue && 'bg-elevated/60'"
              class="hover:bg-elevated/60 flex w-full items-center gap-2 px-3 py-2 text-start"
              type="button"
              @click="pick(user)"
            >
              <span class="min-w-0 flex-1">
                <UserInfo :user="user" />
              </span>
              <UIcon
                v-if="user.id === modelValue"
                class="text-primary size-4 shrink-0"
                name="i-lucide-check"
              />
            </button>
            <div
              v-if="loadingMore"
              class="text-muted flex items-center justify-center gap-2 py-2"
            >
              <UIcon
                class="size-4 animate-spin"
                name="i-lucide-loader-circle"
              />
              <span class="text-sm">
                {{ t("features.depts.form.leaderLoadingMore") }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </UFormField>
</template>
