<script setup lang="ts">
/** 带文字标签的开关（对齐 React 端 `DemoSwitch`），Nuxt UI `USwitch` 自带 label 槽位。 */
defineProps<{ label: string }>();

const model = defineModel<boolean>({ required: true });
</script>

<template>
  <USwitch v-model="model" :label="label" size="sm" />
</template>
