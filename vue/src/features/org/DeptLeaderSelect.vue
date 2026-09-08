<script setup lang="ts">
import type { User } from "@/lib/api-types";
import Spinner from "@/components/ui/spinner/index.vue";
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useInfiniteScroll } from "@vueuse/core";
import { useInfiniteQuery } from "@tanstack/vue-query";

import { fetchApiList } from "@/lib/api-client";

/**
 * 负责人选择器（USelectMenu + 无限滚动，官方示例形态：
 * ui.nuxt.com/docs/components/select-menu#with-infinite-scroll）：
 * /users 分页下拉 + 弹层滚动到底自动加载下一页。
 *
 * - 数据用 useInfiniteQuery 缓存（跨弹窗共享、staleTime 内开关弹窗不重复请求）；
 * - 无限滚动挂 USelectMenu 的 viewportRef（useInfiniteScroll），翻页中不重复触发；
 * - 选中回显头像走 USelectMenu 的 avatar prop（leading 位），选项自带 avatar；
 * - 编辑回显兜底：当前负责人不在已加载用户列表中时补为首条候选；
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
  retry: false,
});

const failed = computed(() => usersQuery.isError.value);
const loading = computed(() => usersQuery.isLoading.value);
const loadingMore = computed(() => usersQuery.isFetchingNextPage.value);
const hasNextPage = computed(() => usersQuery.hasNextPage.value);

interface LeaderOption {
  label: string;
  value: string;
  avatar?: { src: string; alt: string };
}

const items = computed<LeaderOption[]>(() => {
  const options = (usersQuery.data.value?.pages ?? []).flatMap((page) =>
    page.data.map((user) => ({
      label: user.displayName || user.username,
      value: user.id,
      ...(user.avatar
        ? {
            avatar: {
              src: user.avatar,
              alt: user.displayName || user.username,
            },
          }
        : {}),
    })),
  );

  // 编辑回显兜底：当前负责人不在已加载用户列表中时补为首条候选
  if (
    props.currentLeader &&
    props.modelValue &&
    !options.some((option) => option.value === props.currentLeader!.id)
  ) {
    options.unshift({
      label: props.currentLeader.displayName,
      value: props.currentLeader.id,
    });
  }

  return options;
});

const selectedOption = computed(
  () => items.value.find((option) => option.value === props.modelValue) ?? null,
);

const placeholder = computed(() => {
  if (failed.value) return t("features.depts.form.leaderLoadFailed");
  if (items.value.length === 0 && !props.currentLeader) {
    return t("features.depts.form.leaderEmpty");
  }

  return t("features.depts.form.leaderPlaceholder");
});

const leaderMenu = useTemplateRef("leaderMenu");

/** 弹层滚动接近底部加载下一页（翻页中不重复触发） */
useInfiniteScroll(
  () => leaderMenu.value?.viewportRef,
  () => {
    void usersQuery.fetchNextPage();
  },
  {
    canLoadMore: () => hasNextPage.value && !loadingMore.value && !failed.value,
  },
);

function onSelect(key: unknown) {
  emit(
    "update:modelValue",
    key === null || key === undefined ? "" : String(key),
  );
}
</script>

<script lang="ts">
export default { name: "DeptLeaderSelect" };
</script>

<template>
  <UFormField :label="t('features.depts.form.leader')">
    <USelectMenu
      ref="leaderMenu"
      :avatar="selectedOption?.avatar"
      :clear="!failed"
      :disabled="failed"
      :items="items"
      :model-value="modelValue || undefined"
      :placeholder="placeholder"
      class="w-full"
      value-key="value"
      @update:model-value="onSelect"
    >
      <template v-if="loading" #trailing>
        <Spinner size="sm" />
      </template>
    </USelectMenu>
  </UFormField>
</template>
