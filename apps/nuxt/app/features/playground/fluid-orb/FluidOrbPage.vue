<script setup lang="ts">
import { ref } from 'vue'

import DemoColorSwatches from '../DemoColorSwatches.vue'
import DemoControl from '../DemoControl.vue'
import DemoSection from '../DemoSection.vue'
import DemoSegmented from '../DemoSegmented.vue'
import DemoStage from '../DemoStage.vue'
import PlaygroundPage from '../PlaygroundPage.vue'
import { DEMO_ACCENTS } from '../demo-palette'

import FluidOrb from './FluidOrb.vue'
import { fluidOrbMeta } from './meta'

type OrbSize = 'sm' | 'md' | 'lg'

/** 尺寸用分段而非滑块：size 变更会重建着色器程序，拖拽连续触发没有意义。 */
const ORB_SIZES: Record<OrbSize, number> = { sm: 160, md: 240, lg: 320 }
const SIZE_OPTIONS: { id: OrbSize, label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' }
]

/** 多色组合区固定展示的三枚小球。 */
const ORB_TRIO = [DEMO_ACCENTS[0], DEMO_ACCENTS[1], DEMO_ACCENTS[3]] as const

/**
 * 演示场 › Ai Kit › Fluid Orb（原生 WebGL 片元着色器 fbm 噪声流体，零依赖）。
 * RAF 循环随 `useDemoActive` 暂停 / 重建。
 */
const { t } = useI18n()
const color = ref<string>(DEMO_ACCENTS[0])
const size = ref<OrbSize>('md')
</script>

<template>
  <PlaygroundPage :meta="fluidOrbMeta">
    <DemoSection
      :description="t('features.playground.fluidOrb.singleDescription')"
      :title="t('features.playground.fluidOrb.singleTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.common.color')">
          <DemoColorSwatches
            v-model="color"
            :colors="DEMO_ACCENTS"
            :label="t('features.playground.common.color')"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.common.size')">
          <DemoSegmented
            v-model="size"
            :label="t('features.playground.common.size')"
            :options="SIZE_OPTIONS"
          />
        </DemoControl>
      </template>
      <DemoStage class="min-h-96">
        <ClientOnly>
          <FluidOrb
            :color="color"
            :size="ORB_SIZES[size]"
          />
        </ClientOnly>
      </DemoStage>
      <p class="text-xs text-muted">
        {{ t("features.playground.fluidOrb.webglNote") }}
      </p>
    </DemoSection>

    <DemoSection
      :description="t('features.playground.fluidOrb.trioDescription')"
      :title="t('features.playground.fluidOrb.trioTitle')"
    >
      <DemoStage class="gap-10">
        <ClientOnly>
          <FluidOrb
            v-for="hex in ORB_TRIO"
            :key="hex"
            :color="hex"
            :size="128"
          />
        </ClientOnly>
      </DemoStage>
    </DemoSection>
  </PlaygroundPage>
</template>
