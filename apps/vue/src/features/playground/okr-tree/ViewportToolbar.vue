<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  /** 包 #toolbar 插槽作用域（zoom / zoomIn / zoomOut / reset / fit） */
  scope: {
    zoom: number;
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    fit: () => void;
  };
}>();

const emit = defineEmits<{ reset: [] }>();

const { t } = useI18n();
</script>

<template>
  <!--
    画布工具栏（#toolbar 插槽自绘 Pill，替换包默认中文按钮）：缩放 / 百分比 / 适应 / 重置。
    重置不接 scope.reset——包的 reset 是回到原点(0,0)（画布模式即左上角），
    本页初始态是页面 fit 的居中适配，重置即向页面回抛 reset 事件。
  -->
  <div
    class="flex items-center gap-1 rounded-full border border-default bg-elevated/90 px-1.5 py-0.5 shadow-sm backdrop-blur"
  >
    <UButton
      :aria-label="t('features.playground.okrTree.zoomOut')"
      icon="i-lucide-zoom-out"
      size="sm"
      variant="outline"
      @click="scope.zoomOut()"
    />
    <span class="text-muted w-10 text-center text-xs tabular-nums">
      {{ Math.round(scope.zoom * 100) }}%
    </span>
    <UButton
      :aria-label="t('features.playground.okrTree.zoomIn')"
      icon="i-lucide-zoom-in"
      size="sm"
      variant="outline"
      @click="scope.zoomIn()"
    />
    <UButton
      :aria-label="t('features.playground.okrTree.viewFit')"
      icon="i-lucide-maximize-2"
      size="sm"
      variant="outline"
      @click="scope.fit()"
    />
    <UButton
      :aria-label="t('features.playground.okrTree.viewReset')"
      icon="i-lucide-rotate-ccw"
      size="sm"
      variant="outline"
      @click="emit('reset')"
    />
  </div>
</template>
