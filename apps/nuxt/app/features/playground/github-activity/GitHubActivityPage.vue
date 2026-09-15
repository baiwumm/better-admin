<script setup lang="ts">
import type { Contribution } from './github-activity-types'

import { computed, ref } from 'vue'

import DemoControl from '../DemoControl.vue'
import DemoSection from '../DemoSection.vue'
import DemoSegmented from '../DemoSegmented.vue'
import DemoSwitch from '../DemoSwitch.vue'
import PlaygroundPage from '../PlaygroundPage.vue'
import { DEMO_ACCENTS } from '../demo-palette'

import GitHubActivity from './GitHubActivity.vue'
import {
  DEMO_REPOS,
  GITHUB_SCALE,
  buildContributions
} from './github-activity-data'
import { githubActivityMeta } from './meta'

type Months = '3' | '6' | '12'
type CellSize = '9' | '11' | '13'
type AccentKey = 'green' | 'blue' | 'purple' | 'scale'

const ACCENTS: Record<AccentKey, string | string[]> = {
  green: '#39d353',
  blue: DEMO_ACCENTS[0],
  purple: DEMO_ACCENTS[3],
  scale: [...GITHUB_SCALE]
}

const MONTH_OPTIONS = (['3', '6', '12'] as Months[]).map(id => ({
  id,
  label: id
}))
const CELL_OPTIONS = (['9', '11', '13'] as CellSize[]).map(id => ({
  id,
  label: `${id}px`
}))

/**
 * 演示场 › GitHub Activity（贡献热力图 + 仓库榜折叠面板，CSS 动画）。
 * 数据为本地确定性生成（seed 固定）+ 静态仓库榜，经 props 注入，不请求 GitHub API。
 */
const { t, locale } = useI18n()
const months = ref<Months>('12')
const cellSize = ref<CellSize>('11')
const accent = ref<AccentKey>('green')
const showMonths = ref(true)
const contributions = buildContributions()

const accentOptions = computed(() =>
  (Object.keys(ACCENTS) as AccentKey[]).map(id => ({
    id,
    label: t(`features.playground.githubActivity.accent.${id}`)
  }))
)

const dateFormat = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' })
)

function formatDay(day: Contribution) {
  return t('features.playground.githubActivity.day', {
    count: day.count,
    date: dateFormat.value.format(new Date(`${day.date}T00:00:00`))
  })
}

function formatHeading(total: number, year: number | null) {
  return t('features.playground.githubActivity.heading', {
    count: total,
    year: year ?? ''
  })
}

const toggleLabels = computed(() => ({
  show: t('features.playground.githubActivity.showRepos'),
  hide: t('features.playground.githubActivity.hideRepos')
}))
</script>

<template>
  <PlaygroundPage :meta="githubActivityMeta">
    <DemoSection
      :description="t('features.playground.githubActivity.heatmapDescription')"
      :title="t('features.playground.githubActivity.heatmapTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.githubActivity.months')">
          <DemoSegmented
            v-model="months"
            :label="t('features.playground.githubActivity.months')"
            :options="MONTH_OPTIONS"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.githubActivity.cellSize')">
          <DemoSegmented
            v-model="cellSize"
            :label="t('features.playground.githubActivity.cellSize')"
            :options="CELL_OPTIONS"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.githubActivity.accent')">
          <DemoSegmented
            v-model="accent"
            :label="t('features.playground.githubActivity.accent')"
            :options="accentOptions"
          />
        </DemoControl>
        <DemoSwitch
          v-model="showMonths"
          :label="t('features.playground.githubActivity.showMonths')"
        />
      </template>
      <div class="flex justify-center overflow-x-auto py-2">
        <GitHubActivity
          :accent="ACCENTS[accent]"
          :cell-size="Number(cellSize)"
          :contributions="contributions"
          :format-day="formatDay"
          :format-heading="formatHeading"
          :label="t('features.playground.githubActivity.topLabel')"
          :months="Number(months)"
          :repos="DEMO_REPOS"
          :show-months="showMonths"
          :toggle-labels="toggleLabels"
          class="border border-default"
        />
      </div>
    </DemoSection>
  </PlaygroundPage>
</template>
