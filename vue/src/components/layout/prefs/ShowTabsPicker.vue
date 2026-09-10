<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PickerLabel from "./PickerLabel.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 「显示多标签页」配置项：控制顶栏下方多标签页栏的显隐。
 * 关闭仅隐藏 UI，不清空已打开的标签数据（重新开启后原标签仍在）。
 */
const store = useDesignThemeStore();
const { t } = useI18n();

const model = computed<boolean>({
  get: () => store.showTabs,
  set: (show) => store.setShowTabs(show),
});
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <PickerLabel
      label-key="layout.prefs.showTabs.label"
      tooltip-key="layout.prefs.showTabs.tooltip"
    />
    <USwitch
      v-model="model"
      :aria-label="t('layout.prefs.showTabs.label')"
      checked-icon="i-lucide-check"
      unchecked-icon="i-lucide-x"
    />
  </div>
</template>
