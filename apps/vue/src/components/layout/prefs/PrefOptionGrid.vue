<script setup lang="ts" generic="T extends string">
/**
 * 偏好设置单选网格（better-nuxt ThemePicker 形态）：UButton 按钮网格，
 * 选中项 subtle、其余 outline，图标 + 文案居中；供主题模式 / 色彩模式 /
 * 动画方向 / 路由动画 / 速度 / 圆角六个配置项共用。
 */
defineProps<{
  options: { value: T; label: string; icon?: string }[];
  /** 网格列数（Tailwind 类名需为静态字面量，故枚举） */
  columns?: 2 | 3 | 4;
}>();

const model = defineModel<T>({ required: true });

const COLUMN_CLASS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
} as const;
</script>

<template>
  <div class="grid gap-1.5" :class="COLUMN_CLASS[columns ?? 3]">
    <UButton
      v-for="option in options"
      :key="option.value"
      color="neutral"
      size="sm"
      :variant="model === option.value ? 'subtle' : 'outline'"
      :icon="option.icon"
      :label="option.label"
      :aria-pressed="model === option.value"
      class="justify-center ring-default text-xs"
      :ui="{ leadingIcon: 'size-3.5', label: 'truncate' }"
      @click="model = option.value"
    />
  </div>
</template>
