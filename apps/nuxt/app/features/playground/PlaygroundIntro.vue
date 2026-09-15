<script setup lang="ts">
import type { DemoMeta, DemoPackage } from './types'

import { npmUrl, sourceUrl } from './constants'

/**
 * 演示页页首信息卡（四端统一结构，规范见 plan-dashboard-playground.md §5.2）：
 * 标题区（标题 / 描述 / 主要场景）→ 依赖区（包 Chip 或「零新依赖」标签）
 * → 关联区（查看源码 GitHub 链接 + 项目内使用跳转）。
 * 版本号由 `packageVersion()` 从 package.json 自动读取；文案全部走 i18n。
 * 对齐 React 端 HeroUI Card 版本，卡片 / 徽标 / 按钮 / Tooltip 用 Nuxt UI 内置组件。
 */
defineProps<{ meta: DemoMeta }>()

const { t } = useI18n()
const router = useRouter()

/** 依赖 Chip 内的三个图标外链（npm / GitHub / Docs），带 Tooltip。 */
function packageLinks(pkg: DemoPackage) {
  const links = [
    {
      href: pkg.npm ?? npmUrl(pkg.name),
      label: t('features.playground.intro.npm'),
      icon: 'i-lucide-package'
    },
    {
      href: pkg.github,
      label: t('features.playground.intro.github'),
      icon: 'i-lucide-folder-git-2'
    }
  ]

  if (pkg.docs) {
    links.push({
      href: pkg.docs,
      label: t('features.playground.intro.docs'),
      icon: 'i-lucide-book-open'
    })
  }

  return links
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-1">
        <h2 class="font-bold text-highlighted">
          {{ t(meta.titleKey) }}
        </h2>
        <p class="text-xs text-muted">
          {{ t(meta.descriptionKey) }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-muted">
          {{ t("features.playground.intro.scenario") }}
        </span>
        <p class="text-sm text-default">
          {{ t(meta.scenarioKey) }}
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-muted">
          {{ t("features.playground.intro.dependencies") }}
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            v-if="meta.packages.length === 0"
            :label="t('features.playground.intro.zeroDependency')"
            color="success"
            size="sm"
            variant="soft"
          />
          <span
            v-for="pkg in meta.packages"
            v-else
            :key="pkg.name"
            class="inline-flex items-center gap-0.5 rounded-full border border-default bg-default py-0.5 pr-1 pl-2.5"
          >
            <span class="mr-1 font-mono text-xs text-highlighted">
              {{ pkg.name }}<span class="text-muted">@{{ pkg.version }}</span>
            </span>
            <UTooltip
              v-for="link in packageLinks(pkg)"
              :key="link.href"
              :delay-duration="0"
              :text="link.label"
              arrow
            >
              <UButton
                :aria-label="link.label"
                :icon="link.icon"
                :to="link.href"
                class="rounded-full"
                color="neutral"
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                variant="ghost"
              />
            </UTooltip>
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          :label="t('features.playground.intro.viewSource')"
          :to="sourceUrl(meta.source)"
          color="neutral"
          icon="i-lucide-file-code-2"
          rel="noopener noreferrer"
          size="sm"
          target="_blank"
          trailing-icon="i-lucide-external-link"
          variant="ghost"
        />
        <div
          v-if="meta.usedIn?.length"
          class="ml-auto flex flex-wrap items-center gap-2"
        >
          <span class="text-xs text-muted">
            {{ t("features.playground.intro.usedIn") }}
          </span>
          <UButton
            v-for="item in meta.usedIn"
            :key="item.to"
            :label="t(item.labelKey)"
            color="neutral"
            size="sm"
            trailing-icon="i-lucide-arrow-up-right"
            variant="subtle"
            @click="router.push(item.to)"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
