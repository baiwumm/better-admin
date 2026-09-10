<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PickerLabel from "./PickerLabel.vue";
import PrefOptionGrid from "./PrefOptionGrid.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { RADII, type RadiusId } from "@/themes/radius";

const RADIUS_ICONS: Record<RadiusId, string> = {
  none: "i-lucide-square",
  small: "i-lucide-square-round-corner",
  medium: "i-lucide-squircle",
  large: "i-lucide-circle",
};

/** 圆角选择器：直角 / 小 / 中 / 大（覆盖 --ui-radius 全站整体缩放，即时生效无动画）。 */
const store = useDesignThemeStore();
const { t } = useI18n();

const options = computed(() =>
  RADII.map(({ id, labelKey }) => ({
    value: id,
    label: t(labelKey),
    icon: RADIUS_ICONS[id],
  })),
);

const model = computed<RadiusId>({
  get: () => store.radius,
  set: (id) => store.setRadius(id),
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <PickerLabel
      label-key="layout.prefs.radius.label"
      tooltip-key="layout.prefs.radius.tooltip"
    />
    <PrefOptionGrid v-model="model" :options="options" :columns="4" />
  </div>
</template>
