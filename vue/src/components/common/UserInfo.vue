<script setup lang="ts">
import { computed } from "vue";

import type { User } from "@/lib/api-types";

/** 用户信息合并展示（头像 + 显示名 + 用户名/邮箱），列表与选择器共用。 */
const props = withDefaults(
  defineProps<{
    user: Pick<User, "avatar" | "displayName" | "username" | "email">;
    /** 副行内容：username（默认）或 email */
    sub?: "username" | "email";
  }>(),
  { sub: "username" },
);

const initials = computed(() =>
  (props.user.displayName || props.user.username).slice(0, 1).toUpperCase(),
);
const subText = computed(() =>
  props.sub === "email"
    ? props.user.email
    : props.user.username || props.user.email,
);
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <UAvatar
      :alt="user.displayName || user.username"
      :src="user.avatar ?? undefined"
      :text="initials"
      size="sm"
    />
    <div class="min-w-0 leading-tight">
      <div class="truncate text-sm font-medium">
        {{ user.displayName || user.username }}
      </div>
      <div class="text-muted truncate text-xs">
        {{ subText }}
      </div>
    </div>
  </div>
</template>
