<script setup lang="ts">
import type { DirectoryEntry, Post } from "@/lib/api-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";

import { fetchPostMembers } from "./post-api";

import Spinner from "@/components/ui/spinner/index.vue";

/**
 * 岗位在职人员抽屉（在职人数穿透，契约 v1.6.0 GET /org/posts/:id/members，
 * 对应 React 端 post-members-drawer.tsx）：一次拉取前 50 名在职人员展示
 * （岗位在职人数量级小，不做分页 UI）。
 */
const props = defineProps<{
  open: boolean;
  /** 穿透目标岗位（关闭后置 null） */
  post: Post | null;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

const { t } = useI18n();

/** 与 React 端一致：仅取前 50 名 */
const MEMBERS_LIMIT = 50;

const membersQuery = useQuery({
  queryKey: computed(() => ["org", "posts", "members", props.post?.id ?? ""]),
  queryFn: () => fetchPostMembers(props.post!.id, 1, MEMBERS_LIMIT),
  enabled: computed(() => props.open && Boolean(props.post)),
  placeholderData: keepPreviousData,
  staleTime: 0,
});

const members = computed<DirectoryEntry[]>(
  () => membersQuery.data.value?.data ?? [],
);
const total = computed(() => membersQuery.data.value?.pagination.total ?? 0);

const title = computed(() =>
  props.post
    ? t("features.posts.members.title", { name: props.post.name })
    : t("features.posts.members.titleFallback"),
);

function close() {
  emit("update:open", false);
}
</script>

<script lang="ts">
export default { name: "PostMembersDrawer" };
</script>

<template>
  <USlideover
    :open="open"
    :ui="{ content: 'w-[420px] max-w-[85vw]' }"
    :title="title"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <div
        v-if="membersQuery.isLoading.value"
        class="grid place-items-center py-10"
      >
        <Spinner size="md" />
      </div>
      <p v-else-if="membersQuery.isError.value" class="text-muted text-sm">
        {{ t("features.posts.members.loadFailed") }}
      </p>
      <p
        v-else-if="members.length === 0"
        class="text-muted py-6 text-center text-sm"
      >
        {{ t("features.posts.members.empty") }}
      </p>
      <div v-else class="flex flex-col gap-2">
        <p class="text-muted text-xs">
          {{
            t("features.posts.members.count", {
              count: total || members.length,
            })
          }}
        </p>
        <div
          v-for="entry in members"
          :key="entry.id"
          class="border-default flex items-center gap-3 rounded-xl border px-3 py-2"
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
        </div>
      </div>
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
