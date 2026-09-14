<script setup lang="ts">
import { computed } from 'vue'

/** 主题切换（明暗模式）：system/light/dark 三态。
 * 平移自 vue/src/components/layout/ThemeSwitch.vue；useColorMode 为
 * @nuxtjs/color-mode（@nuxt/ui 内置集成）auto-import，Vue 端 @vueuse
 * 的 "auto" 在此对应该模块的 "system"。 */
const colorMode = useColorMode()
const { t } = useI18n()

const options = computed<
  { icon: string, label: string, value: 'system' | 'light' | 'dark' }[]
>(() => [
  {
    icon: 'i-lucide-monitor',
    label: t('layout.prefs.themeMode.system'),
    value: 'system'
  },
  {
    icon: 'i-lucide-sun',
    label: t('layout.prefs.themeMode.light'),
    value: 'light'
  },
  {
    icon: 'i-lucide-moon',
    label: t('layout.prefs.themeMode.dark'),
    value: 'dark'
  }
])

const items = computed(() => [
  options.value.map(option => ({
    label: option.label,
    icon: option.icon,
    onSelect: () => {
      colorMode.preference = option.value
    }
  }))
])

const currentIcon = computed(
  () =>
    options.value.find(option => option.value === colorMode.value)?.icon
    ?? 'i-lucide-monitor'
)
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
