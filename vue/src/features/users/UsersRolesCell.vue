<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { UserRoleSummary } from "@/lib/api-types";

/** 角色单元格：最多展示 2 个角色徽标，剩余以 +N 聚合（悬停显示全量）。 */
const props = defineProps<{ roles: UserRoleSummary[] }>();

const { t } = useI18n();

const visibleRoles = computed(() => props.roles.slice(0, 2));
const extraCount = computed(
  () => props.roles.length - visibleRoles.value.length,
);
const allNames = computed(() =>
  props.roles.map((role) => role.name).join("、"),
);
const moreLabel = computed(() => t("features.users.rolesMore"));
</script>

<template>
  <span v-if="roles.length === 0" class="text-muted text-sm">—</span>
  <div v-else class="flex flex-wrap items-center justify-center gap-1">
    <UBadge
      v-for="role in visibleRoles"
      :key="role.id"
      :label="role.name"
      color="neutral"
      variant="soft"
    />
    <UTooltip v-if="extraCount > 0" :text="allNames">
      <UBadge
        :aria-label="moreLabel"
        :label="`+${extraCount}`"
        color="neutral"
        variant="soft"
      />
    </UTooltip>
  </div>
</template>
