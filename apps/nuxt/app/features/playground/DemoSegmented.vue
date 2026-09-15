<script setup lang="ts" generic="T extends string">
import type { TabsItem } from '@nuxt/ui'

import { computed } from 'vue'

/**
 * 分段单选（对齐 React 端 `DemoSegmented` / ToggleButtonGroup single）：
 * 用 Nuxt UI `UTabs` 的 pill 形态、关闭 content 面板，泛型收敛选项 id。
 */
const props = defineProps<{
  label: string
  options: { id: T, label: string }[]
}>()

const model = defineModel<T>({ required: true })

const items = computed<TabsItem[]>(() =>
  props.options.map(option => ({ label: option.label, value: option.id }))
)

function onUpdate(value: string | number) {
  model.value = String(value) as T
}
</script>

<template>
  <UTabs
    :aria-label="label"
    :content="false"
    :items="items"
    :model-value="model"
    size="sm"
    @update:model-value="onUpdate"
  />
</template>
