<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ENV } from "@/lib/env";

defineProps<{
  /** 折叠态（侧边栏 icon 模式）只展示 Logo 图标 */
  collapsed?: boolean;
}>();

const { t } = useI18n();
const appName = computed(() => ENV.appName);
const brandTitle = computed(() => t("auth.brand.slogan"));
</script>

<script lang="ts">
export default { name: "AppLogo" };
</script>

<template>
  <div class="flex items-center gap-2 overflow-hidden">
    <UIcon
      class="size-6 shrink-0 text-primary"
      name="i-lucide-layout-dashboard"
    />
    <span v-if="!collapsed" class="truncate text-base font-bold tracking-tight">
      {{ appName }}
    </span>
    <span v-if="!collapsed" class="sr-only">{{ brandTitle }}</span>
  </div>
</template>
