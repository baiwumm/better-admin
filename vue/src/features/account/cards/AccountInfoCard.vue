<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";

import { useI18n } from "vue-i18n";

import { formatDateTime } from "@/lib/format-date";

/** 只读账号信息卡（对齐 React 端 account-info-card）：角色 / 状态 / 注册时间 / 最近登录 */
defineProps<{ profile: AccountProfile }>();

const { t, locale } = useI18n();
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-bold">{{ t("features.account.info.title") }}</h3>
      <p class="text-muted text-xs">
        {{ t("features.account.info.description") }}
      </p>
    </template>

    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-muted text-sm">
          {{ t("features.account.info.roles") }}
        </span>
        <span
          v-if="profile.roles.length > 0"
          class="flex flex-wrap items-center gap-1"
        >
          <UBadge
            v-for="role in profile.roles"
            :key="role.id"
            :label="role.name"
            color="neutral"
            variant="subtle"
          />
        </span>
        <span v-else class="text-muted text-sm">
          {{ t("features.account.info.noRole") }}
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-muted text-sm">
          {{ t("features.account.info.status") }}
        </span>
        <UBadge
          :color="profile.status === 'active' ? 'success' : 'error'"
          :label="
            t(
              profile.status === 'active'
                ? 'features.account.info.statusActive'
                : 'features.account.info.statusDisabled',
            )
          "
          variant="soft"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-muted text-sm">
          {{ t("features.account.info.createdAt") }}
        </span>
        <span class="text-sm">
          {{ formatDateTime(profile.createdAt, locale) }}
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-muted text-sm">
          {{ t("features.account.info.lastLoginAt") }}
        </span>
        <span class="text-sm">
          {{
            profile.lastLoginAt
              ? formatDateTime(profile.lastLoginAt, locale)
              : t("features.account.info.never")
          }}
        </span>
      </div>
    </div>
  </UCard>
</template>
