<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PickerLabel from "./PickerLabel.vue";
import PrefOptionGrid from "./PrefOptionGrid.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import {
  ROUTE_TRANSITION_SPEEDS,
  type RouteTransitionSpeedId,
} from "@/themes/route-transitions";

const SPEED_ICONS: Record<RouteTransitionSpeedId, string> = {
  slow: "i-lucide-snail",
  normal: "i-lucide-gauge",
  fast: "i-lucide-rabbit",
};

/** 页面切换速度选择器：慢 / 标准 / 快（仅作用于页面切换动画的时长倍率）。 */
const store = useDesignThemeStore();
const { t } = useI18n();

const options = computed(() =>
  ROUTE_TRANSITION_SPEEDS.map(({ id, labelKey }) => ({
    value: id,
    label: t(labelKey),
    icon: SPEED_ICONS[id],
  })),
);

const model = computed<RouteTransitionSpeedId>({
  get: () => store.routeTransitionSpeed,
  set: (speed) => store.setRouteTransitionSpeed(speed),
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <PickerLabel
      label-key="layout.prefs.speed.label"
      tooltip-key="layout.prefs.speed.tooltip"
    />
    <PrefOptionGrid v-model="model" :options="options" :columns="3" />
  </div>
</template>
