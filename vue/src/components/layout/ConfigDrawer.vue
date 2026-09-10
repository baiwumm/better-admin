<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import ColorVisionPicker from "./prefs/ColorVisionPicker.vue";
import RadiusPicker from "./prefs/RadiusPicker.vue";
import RouteTransitionPicker from "./prefs/RouteTransitionPicker.vue";
import RouteTransitionSpeedPicker from "./prefs/RouteTransitionSpeedPicker.vue";
import ShowTabsPicker from "./prefs/ShowTabsPicker.vue";
import ThemeColorPicker from "./prefs/ThemeColorPicker.vue";
import ThemeModePicker from "./prefs/ThemeModePicker.vue";
import TransitionDirectionPicker from "./prefs/TransitionDirectionPicker.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 偏好设置抽屉（对齐 React 端 theme-settings-drawer）：Header 右侧 paint-bucket
 * 按钮触发，右侧 USlideover 弹出。配置项各自抽为独立组件（prefs/），顺序与
 * React 端一致：
 * - ThemeColorPicker           主题色（Black 黑白 + Tailwind 色板 + 随机）
 * - ThemeModePicker            主题模式
 * - ColorVisionPicker          色彩模式（正常 / 灰色 / 色弱，全局滤镜）
 * - TransitionDirectionPicker  主题动画方向（主题色 / 模式切换的揭示方向）
 * - RouteTransitionPicker      页面切换动画
 * - RouteTransitionSpeedPicker 页面切换速度
 * - RadiusPicker               圆角（直角 / 小 / 中 / 大，全站圆角整体缩放）
 * - ShowTabsPicker             显示多标签页
 *
 * 语言切换由 Header 的 LanguageSwitch 承担，不在抽屉内重复提供。
 * 底部「重置设置」由 store.resetPreferences 在单次揭示动画内原子完成，
 * 动画结束后再弹成功 toast。
 */
const open = ref(false);
const resetting = ref(false);
const { t } = useI18n();
const toast = useToast();
const store = useDesignThemeStore();

async function handleReset() {
  resetting.value = true;

  try {
    await store.resetPreferences();
    toast.add({ color: "success", title: t("layout.prefs.resetSuccess") });
  } finally {
    resetting.value = false;
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="t('layout.prefs.title')">
    <UButton
      :aria-label="t('layout.prefs.title')"
      color="neutral"
      icon="i-lucide-paint-bucket"
      variant="ghost"
      size="sm"
    />

    <template #body>
      <div class="flex flex-col gap-6">
        <ThemeColorPicker />
        <ThemeModePicker />
        <ColorVisionPicker />
        <TransitionDirectionPicker />
        <RouteTransitionPicker />
        <RouteTransitionSpeedPicker />
        <RadiusPicker />
        <ShowTabsPicker />
      </div>
    </template>

    <template #footer>
      <UButton
        block
        color="error"
        icon="i-lucide-rotate-ccw"
        :label="t('layout.prefs.reset')"
        :loading="resetting"
        @click="handleReset"
      />
    </template>
  </USlideover>
</template>
