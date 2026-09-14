<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { User } from "@/lib/api-types";
import { buildProfileLinks, openExternalLink } from "@/lib/profile-links";

/** 个人链接单元格：网站用 lucide 通用图标；GitHub / X 品牌图形走 Simple Icons。 */
const props = defineProps<{ user: User }>();

const { t } = useI18n();

const links = computed(() => buildProfileLinks(props.user));

function iconFor(key: string) {
  if (key === "website") return "i-lucide-house";
  if (key === "github") return "i-logos-github-icon";

  return "i-logos-x";
}

function linkTitle(key: string, url: string, name: string) {
  return `${name} ${t(key)} · ${url}`;
}
</script>

<template>
  <span v-if="links.length === 0" class="text-muted text-sm">—</span>
  <div v-else class="flex items-center justify-center gap-1">
    <UTooltip
      v-for="link in links"
      :key="link.key"
      :text="
        linkTitle(link.labelKey, link.url, user.displayName || user.username)
      "
    >
      <UButton
        :aria-label="t(link.labelKey)"
        :icon="iconFor(link.key)"
        color="neutral"
        size="xs"
        variant="ghost"
        @click="openExternalLink(link.url)"
      />
    </UTooltip>
  </div>
</template>
