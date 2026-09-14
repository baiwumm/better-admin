<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useColorMode } from "@vueuse/core";

/** 主题切换（明暗模式）：system/light/dark 三态（@vueuse/core，Nuxt UI Vue 集成同源）。 */
const colorMode = useColorMode();
const { t } = useI18n();

const options = computed<
  { icon: string; label: string; value: "auto" | "light" | "dark" }[]
>(() => [
  {
    icon: "i-lucide-monitor",
    label: t("layout.prefs.themeMode.system"),
    value: "auto",
  },
  {
    icon: "i-lucide-sun",
    label: t("layout.prefs.themeMode.light"),
    value: "light",
  },
  {
    icon: "i-lucide-moon",
    label: t("layout.prefs.themeMode.dark"),
    value: "dark",
  },
]);

const items = computed(() => [
  options.value.map((option) => ({
    label: option.label,
    icon: option.icon,
    onSelect: () => {
      colorMode.value = option.value;
    },
  })),
]);

const currentIcon = computed(
  () =>
    options.value.find((option) => option.value === colorMode.value)?.icon ??
    "i-lucide-monitor",
);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :icon="currentIcon"
      aria-label="Theme"
      color="neutral"
      variant="ghost"
    />
  </UDropdownMenu>
</template>
