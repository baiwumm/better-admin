<script setup lang="ts">
import type { DemoMeta } from "./types";

import PlaygroundIntro from "./PlaygroundIntro.vue";

/** 演示页骨架：页首固定 `PlaygroundIntro` 信息卡，下方纵向排布各演示区块。 */
defineProps<{ meta: DemoMeta }>();
</script>

<template>
  <div class="flex flex-col gap-4">
    <PlaygroundIntro :meta="meta" />
    <slot />
  </div>
</template>
