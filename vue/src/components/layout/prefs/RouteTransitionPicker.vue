<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PickerLabel from "./PickerLabel.vue";
import PrefOptionGrid from "./PrefOptionGrid.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import {
  ROUTE_TRANSITIONS,
  type RouteTransitionId,
} from "@/themes/route-transitions";

const ROUTE_ICONS: Record<RouteTransitionId, string> = {
  none: "i-lucide-ban",
  fade: "i-lucide-contrast",
  glide: "i-lucide-move-horizontal",
  rise: "i-lucide-move-up",
  zoom: "i-lucide-zoom-in",
  reveal: "i-lucide-scan",
  cover: "i-lucide-chevrons-right",
  circle: "i-lucide-aperture",
  blur: "i-lucide-focus",
};

/**
 * 页面切换动画选择器：9 种预设（themes/route-transitions.ts），
 * 选择结果持久化并写入 <html data-route-transition> 供 CSS 生效。
 */
const store = useDesignThemeStore();
const { t } = useI18n();

const options = computed(() =>
  ROUTE_TRANSITIONS.map(({ id, labelKey }) => ({
    value: id,
    label: t(labelKey),
    icon: ROUTE_ICONS[id],
  })),
);

const model = computed<RouteTransitionId>({
  get: () => store.routeTransition,
  set: (id) => store.setRouteTransition(id),
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <PickerLabel
      label-key="layout.prefs.routeTransition.label"
      tooltip-key="layout.prefs.routeTransition.tooltip"
    />
    <PrefOptionGrid v-model="model" :options="options" :columns="3" />
  </div>
</template>
