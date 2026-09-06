<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 全屏切换按钮（对齐 React 端 FullscreenButton）：
 * 以 document.fullscreenElement 为准并监听 fullscreenchange 同步状态。
 */
const { t } = useI18n();

const isFullscreen = ref(false);

function sync() {
  isFullscreen.value = document.fullscreenElement != null;
}

function toggle() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen();
  }
}

onMounted(() => {
  sync();
  document.addEventListener("fullscreenchange", sync);
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", sync);
});

const icon = computed(() =>
  isFullscreen.value ? "i-lucide-minimize" : "i-lucide-maximize",
);
const label = computed(() =>
  isFullscreen.value
    ? t("layout.fullscreen.exit")
    : t("layout.fullscreen.enter"),
);
</script>

<template>
  <UButton
    :aria-label="label"
    :icon="icon"
    color="neutral"
    variant="ghost"
    @click="toggle"
  />
</template>
