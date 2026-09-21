<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import DemoControl from "../DemoControl.vue";
import DemoSection from "../DemoSection.vue";
import DemoSlider from "../DemoSlider.vue";
import DemoStage from "../DemoStage.vue";
import PlaygroundPage from "../PlaygroundPage.vue";

import Loader from "./Loader.vue";
import { LOADER_VARIANTS, type LoaderVariant } from "./loader-variants";
import { loadersMeta } from "./meta";

/**
 * 演示场 › 加载动画：beUI `loader`（单组件 17 种加载动效变体）。
 *
 * 与 React 基准的差异只在动画引擎：React 用 motion 关键帧，本端按端内约定
 * （不引入 motion-v）以 CSS `@keyframes` 等效，几何与时长口径不变；React 侧
 * 因 motion 不重应用循环中的 transition 而需要 `key={speed}` 重挂载，本端改
 * CSS 变量即时生效，故页面不传 key。变体名属技术专名，保留英文不译。
 */
const SIZE_RANGE = { min: 16, max: 96, step: 4 };
const SPEED_RANGE = { min: 0.25, max: 3, step: 0.25 };

const { t } = useI18n();

const size = ref(36);
const speed = ref(1);
const variant = ref<LoaderVariant>("spinner");
</script>

<template>
  <PlaygroundPage :meta="loadersMeta">
    <!-- 区块一：17 种变体全员展示墙，滑块统一调节尺寸与周期时长 -->
    <DemoSection
      :description="t('features.playground.loaders.variantsDescription')"
      :title="t('features.playground.loaders.variantsTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.common.size')">
          <DemoSlider
            v-model="size"
            :label="t('features.playground.common.size')"
            :max="SIZE_RANGE.max"
            :min="SIZE_RANGE.min"
            :step="SIZE_RANGE.step"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.common.duration')">
          <DemoSlider
            v-model="speed"
            :format-options="{ style: 'unit', unit: 'second' }"
            :label="t('features.playground.common.duration')"
            :max="SPEED_RANGE.max"
            :min="SPEED_RANGE.min"
            :step="SPEED_RANGE.step"
          />
        </DemoControl>
      </template>

      <!-- 5 列给 percent（宽度 size*1.4）留足余量，6 列在 size=96 时会横向溢出 -->
      <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <!-- 卡片高度不写死：随 size 撑开，grid 行内各卡等高、矮内容垂直居中 -->
        <div
          v-for="item in LOADER_VARIANTS"
          :key="item"
          class="border-default bg-elevated/60 flex min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border p-6"
        >
          <Loader :size="size" :speed="speed" :variant="item" />
          <span class="font-mono text-xs">{{ item }}</span>
        </div>
      </div>
    </DemoSection>

    <!-- 区块二：选中一种变体并调节尺寸 / 周期时长，中央大号实时预览 -->
    <DemoSection
      :description="t('features.playground.loaders.paramsDescription')"
      :title="t('features.playground.loaders.paramsTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.common.size')">
          <DemoSlider
            v-model="size"
            :label="t('features.playground.common.size')"
            :max="SIZE_RANGE.max"
            :min="SIZE_RANGE.min"
            :step="SIZE_RANGE.step"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.common.duration')">
          <DemoSlider
            v-model="speed"
            :format-options="{ style: 'unit', unit: 'second' }"
            :label="t('features.playground.common.duration')"
            :max="SPEED_RANGE.max"
            :min="SPEED_RANGE.min"
            :step="SPEED_RANGE.step"
          />
        </DemoControl>
      </template>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-muted text-xs">
            {{ t("features.playground.loaders.variant") }}
          </span>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="item in LOADER_VARIANTS"
              :key="item"
              :aria-label="item"
              :label="item"
              :variant="item === variant ? 'solid' : 'outline'"
              class="font-mono text-xs"
              size="sm"
              @click="variant = item"
            />
          </div>
        </div>
        <DemoStage class="min-h-52">
          <Loader :size="size" :speed="speed" :variant="variant" />
        </DemoStage>
      </div>
    </DemoSection>
  </PlaygroundPage>
</template>
