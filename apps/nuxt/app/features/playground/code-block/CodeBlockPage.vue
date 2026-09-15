<script setup lang="ts">
import type { CodeSampleLanguage } from './code-samples'

import { computed, ref } from 'vue'

import DemoColorSwatches from '../DemoColorSwatches.vue'
import DemoControl from '../DemoControl.vue'
import DemoSection from '../DemoSection.vue'
import DemoSegmented from '../DemoSegmented.vue'
import DemoSwitch from '../DemoSwitch.vue'
import PlaygroundPage from '../PlaygroundPage.vue'
import { DEMO_ACCENTS } from '../demo-palette'

import CodeBlock from './CodeBlock.vue'
import { CODE_SAMPLES, CODE_SAMPLE_LANGUAGES } from './code-samples'
import { codeBlockMeta } from './meta'

type ThemeMode = 'auto' | 'light' | 'dark'

const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark']

/** 主题色派生区固定展示的语言（短、彩色 token 多，最能体现派生效果）。 */
const ACCENT_SAMPLE = CODE_SAMPLES.css

/** 无边框嵌入区的行内示例。 */
const INLINE_SAMPLE = `pnpm add -E prismjs @number-flow/vue`

/**
 * 演示场 › 代码块：prismjs 高亮 + CSS 复制反馈（按 rare-ui `code-block` 视觉重写）。
 * 三个区块：多语言高亮（语言 / 主题模式 / 行号 / 高亮行）、主题色派生（单一 hex 派生整套主题）、
 * 无边框嵌入（浮动复制按钮）。全部为前端本地状态，无写库副作用。
 */
const { t } = useI18n()
const language = ref<CodeSampleLanguage>('tsx')
const mode = ref<ThemeMode>('auto')
const showLineNumbers = ref(true)
const highlight = ref(false)
const accent = ref<string>(DEMO_ACCENTS[0])

const sample = computed(() => CODE_SAMPLES[language.value])
const languageOptions = CODE_SAMPLE_LANGUAGES.map(id => ({ id, label: id }))
const modeOptions = computed(() =>
  THEME_MODES.map(id => ({
    id,
    label: t(`features.playground.codeBlock.mode.${id}`)
  }))
)
</script>

<template>
  <PlaygroundPage :meta="codeBlockMeta">
    <DemoSection
      :description="t('features.playground.codeBlock.languagesDescription')"
      :title="t('features.playground.codeBlock.languagesTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.codeBlock.language')">
          <DemoSegmented
            v-model="language"
            :label="t('features.playground.codeBlock.language')"
            :options="languageOptions"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.codeBlock.mode')">
          <DemoSegmented
            v-model="mode"
            :label="t('features.playground.codeBlock.mode')"
            :options="modeOptions"
          />
        </DemoControl>
        <DemoSwitch
          v-model="showLineNumbers"
          :label="t('features.playground.codeBlock.lineNumbers')"
        />
        <DemoSwitch
          v-model="highlight"
          :label="t('features.playground.codeBlock.highlightLines')"
        />
      </template>
      <CodeBlock
        :accent="accent"
        :code="sample.code"
        :filename="sample.filename"
        :highlight-lines="highlight ? [2, 3, 4] : undefined"
        :language="language"
        :mode="mode"
        :show-line-numbers="showLineNumbers"
      />
    </DemoSection>

    <DemoSection
      :description="t('features.playground.codeBlock.accentDescription')"
      :title="t('features.playground.codeBlock.accentTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.codeBlock.accent')">
          <DemoColorSwatches
            v-model="accent"
            :colors="DEMO_ACCENTS"
            :label="t('features.playground.codeBlock.accent')"
          />
        </DemoControl>
      </template>
      <div class="grid gap-4 lg:grid-cols-2">
        <CodeBlock
          :accent="accent"
          :code="ACCENT_SAMPLE.code"
          :filename="`${ACCENT_SAMPLE.filename} · light`"
          :show-copy-button="false"
          language="css"
          mode="light"
        />
        <CodeBlock
          :accent="accent"
          :code="ACCENT_SAMPLE.code"
          :filename="`${ACCENT_SAMPLE.filename} · dark`"
          :show-copy-button="false"
          language="css"
          mode="dark"
        />
      </div>
    </DemoSection>

    <DemoSection
      :description="t('features.playground.codeBlock.inlineDescription')"
      :title="t('features.playground.codeBlock.inlineTitle')"
    >
      <p class="text-sm text-default">
        {{ t("features.playground.codeBlock.inlineLead") }}
      </p>
      <!--
        单行命令 + 浮动复制按钮：容器给最小高度容纳按钮（overflow-hidden 会裁切）并预留右侧空间；
        viewport 是 flex-1 会撑满高度、代码贴顶，改成 flex + items-center 让代码与按钮同轴居中
      -->
      <div class="rounded-3xl border border-default bg-elevated/60 px-3">
        <CodeBlock
          :accent="accent"
          :code="INLINE_SAMPLE"
          :show-frame="false"
          :show-line-numbers="false"
          class="min-h-12 pr-12 [&>div]:flex [&>div]:items-center"
          language="bash"
        />
      </div>
    </DemoSection>
  </PlaygroundPage>
</template>
