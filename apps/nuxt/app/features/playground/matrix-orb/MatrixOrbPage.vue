<script setup lang="ts">
import { computed, ref } from 'vue'

import DemoColorSwatches from '../DemoColorSwatches.vue'
import DemoControl from '../DemoControl.vue'
import DemoSection from '../DemoSection.vue'
import DemoSegmented from '../DemoSegmented.vue'
import DemoSlider from '../DemoSlider.vue'
import DemoStage from '../DemoStage.vue'
import DemoSwitch from '../DemoSwitch.vue'
import PlaygroundPage from '../PlaygroundPage.vue'
import { DEMO_ACCENTS } from '../demo-palette'

import MatrixOrb from './MatrixOrb.vue'
import type { MatrixOrbState } from './matrix-orb-types'
import { matrixOrbMeta } from './meta'

const ORB_STATES: MatrixOrbState[] = ['idle', 'listening', 'thinking']

/**
 * 演示场 › Ai Kit › Matrix Orb（Canvas 2D 点阵光球，零依赖）。
 * idle / listening / thinking 三态平滑混合；listening 振幅可自动包络或手动驱动（对应真实语音电平）。
 */
const { t } = useI18n()
const state = ref<MatrixOrbState>('idle')
const autoLevel = ref(true)
const level = ref(0.6)
const dots = ref(11)
const color = ref<string>(DEMO_ACCENTS[1])

const labels = computed<Record<MatrixOrbState, string>>(() => ({
  idle: t('features.playground.matrixOrb.state.idle'),
  listening: t('features.playground.matrixOrb.state.listening'),
  thinking: t('features.playground.matrixOrb.state.thinking')
}))
const stateOptions = computed(() =>
  ORB_STATES.map(id => ({ id, label: labels.value[id] }))
)
</script>

<template>
  <PlaygroundPage :meta="matrixOrbMeta">
    <DemoSection
      :description="t('features.playground.matrixOrb.stageDescription')"
      :title="t('features.playground.matrixOrb.stageTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.matrixOrb.stateLabel')">
          <DemoSegmented
            v-model="state"
            :label="t('features.playground.matrixOrb.stateLabel')"
            :options="stateOptions"
          />
        </DemoControl>
        <DemoSwitch
          v-model="autoLevel"
          :label="t('features.playground.matrixOrb.autoLevel')"
        />
        <DemoControl
          v-if="!autoLevel"
          :label="t('features.playground.matrixOrb.level')"
        >
          <DemoSlider
            v-model="level"
            :format-options="{ style: 'percent' }"
            :label="t('features.playground.matrixOrb.level')"
            :max="1"
            :min="0"
            :step="0.05"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.matrixOrb.dots')">
          <DemoSlider
            v-model="dots"
            :label="t('features.playground.matrixOrb.dots')"
            :max="17"
            :min="5"
            :step="2"
            class="w-36"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.common.color')">
          <DemoColorSwatches
            v-model="color"
            :colors="DEMO_ACCENTS"
            :label="t('features.playground.common.color')"
          />
        </DemoControl>
      </template>
      <DemoStage class="min-h-80">
        <ClientOnly>
          <MatrixOrb
            :color="color"
            :dots="dots"
            :labels="labels"
            :level="autoLevel ? undefined : level"
            :size="240"
            :state="state"
          />
        </ClientOnly>
      </DemoStage>
    </DemoSection>

    <DemoSection
      :description="t('features.playground.matrixOrb.trioDescription')"
      :title="t('features.playground.matrixOrb.trioTitle')"
    >
      <DemoStage class="gap-10">
        <ClientOnly>
          <MatrixOrb
            v-for="orbState in ORB_STATES"
            :key="orbState"
            :color="color"
            :labels="labels"
            :size="140"
            :state="orbState"
          />
        </ClientOnly>
      </DemoStage>
    </DemoSection>
  </PlaygroundPage>
</template>
