<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PickerLabel from "./PickerLabel.vue";
import PrefOptionGrid from "./PrefOptionGrid.vue";

import {
  type ThemeMode,
  useDesignThemeStore,
} from "@/stores/design-theme-store";

/** 主题模式选择器：跟随系统 / 浅色 / 深色，切换经 store 触发方向揭示动画。 */
const store = useDesignThemeStore();
const { t } = useI18n();

const options = computed(() => [
  {
    value: "system" as ThemeMode,
    label: t("layout.prefs.themeMode.system"),
    icon: "i-lucide-monitor",
  },
  {
    value: "light" as ThemeMode,
    label: t("layout.prefs.themeMode.light"),
    icon: "i-lucide-sun",
  },
  {
    value: "dark" as ThemeMode,
    label: t("layout.prefs.themeMode.dark"),
    icon: "i-lucide-moon",
  },
]);

const model = computed<ThemeMode>({
  get: () => store.themeMode,
  set: (mode) => store.setThemeMode(mode),
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <PickerLabel
      label-key="layout.prefs.themeMode.label"
      tooltip-key="layout.prefs.themeMode.tooltip"
    />
    <PrefOptionGrid v-model="model" :options="options" :columns="3" />
  </div>
</template>
