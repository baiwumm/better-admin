<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";

import PickerLabel from "./PickerLabel.vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import {
  formatColorLabel,
  getColorShade,
  PRIMARY_COLORS,
} from "@/themes/primary-colors";

/**
 * 主题色选择器（参考 better-nuxt ThemePickerPrimaryColor）：
 * Black 黑白档 + Tailwind 色相色板按钮网格（色点预览取 500 shade）+ 随机换色。
 * 切换经 store 触发方向揭示动画；色名硬编码英文，不走 i18n（vue-plan §3 例外项）。
 */
const store = useDesignThemeStore();
const { primaryColor, blackAsPrimary } = storeToRefs(store);
const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <PickerLabel
        label-key="layout.prefs.themeColor.label"
        tooltip-key="layout.prefs.themeColor.tooltip"
      />
      <UButton
        :aria-label="t('layout.prefs.themeColor.random')"
        color="neutral"
        icon="i-lucide-shuffle"
        size="sm"
        variant="ghost"
        class="rounded-full text-muted"
        :ui="{ leadingIcon: 'size-3.5' }"
        @click="store.shufflePrimaryColor()"
      />
    </div>
    <div class="grid grid-cols-3 gap-1.5">
      <UButton
        color="neutral"
        size="sm"
        :variant="blackAsPrimary ? 'subtle' : 'outline'"
        :aria-pressed="blackAsPrimary"
        class="ring-default text-xs"
        label="Black"
        @click="store.setBlackAsPrimary()"
      >
        <template #leading>
          <span
            class="inline-block size-2 rounded-full bg-black dark:bg-white"
          />
        </template>
      </UButton>
      <UButton
        v-for="color in PRIMARY_COLORS"
        :key="color"
        color="neutral"
        size="sm"
        :variant="
          !blackAsPrimary && primaryColor === color ? 'subtle' : 'outline'
        "
        :aria-pressed="!blackAsPrimary && primaryColor === color"
        class="ring-default text-xs"
        :label="formatColorLabel(color)"
        @click="store.setPrimaryColor(color)"
      >
        <template #leading>
          <span
            class="inline-block size-2 rounded-full"
            :style="{ backgroundColor: getColorShade(color, 500) }"
          />
        </template>
      </UButton>
    </div>
  </div>
</template>
