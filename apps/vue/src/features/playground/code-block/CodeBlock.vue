<script setup lang="ts">
import type { LineToken } from "./prism";

import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, onBeforeUnmount, ref } from "vue";

import { buildTheme, styleForTypes, type ThemeMode } from "./code-theme";
import { tokenizeLines } from "./prism";

import { cn } from "@/lib/cn";
import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 代码块（按 rare-ui `code-block` 视觉重写，MIT）：prismjs 直渲染 + 单一 hex 派生浅深双主题。
 * 与 React 端差异：高亮引擎 prism-react-renderer → prismjs（tokenize 后逐行渲染，见 prism.ts）；
 * 复制反馈的图标切换 / 点按缩放 / 对勾描边动画以 CSS transition + `<Transition>` 等效实现，不引入 motion-v。
 * 头部 macOS 风格三色圆点为四端统一的本地增补（纯装饰）。
 */
const props = withDefaults(
  defineProps<{
    /** 源码 */
    code: string;
    /** prism 语言 id，如 "tsx" / "css" / "json" / "bash" */
    language?: string;
    /** 任意 hex，整套主题由其色相派生 */
    accent?: string;
    /** "auto" 跟随页面主题；"dark" / "light" 固定 */
    mode?: "auto" | ThemeMode;
    /** 头部显示的文件名，缺省显示语言 id */
    filename?: string;
    /** 外框（背景 / 边框 / 圆角 / 头部）；关闭只渲染代码 */
    showFrame?: boolean;
    /** 头部栏（外框关闭时无效） */
    showHeader?: boolean;
    /** 行号栏 */
    showLineNumbers?: boolean;
    /** 复制按钮 */
    showCopyButton?: boolean;
    /** 1 基行号高亮（accent 淡色底） */
    highlightLines?: number[];
    class?: string;
  }>(),
  {
    language: "tsx",
    accent: "#F75001",
    mode: "auto",
    filename: undefined,
    showFrame: true,
    showHeader: true,
    showLineNumbers: true,
    showCopyButton: true,
    highlightLines: undefined,
    class: undefined,
  },
);

const COPY_RESET_MS = 1800;
/** 头部 macOS 窗口风格三色圆点（关闭 / 最小化 / 缩放的标准色）。 */
const TRAFFIC_LIGHTS = ["#FF5F57", "#FEBC2E", "#28C840"] as const;

const themeStore = useDesignThemeStore();
const reducedMotion = usePreferredReducedMotion();
const reduce = computed(() => reducedMotion.value === "reduce");

const safeMode = computed<ThemeMode>(() =>
  props.mode === "light" || props.mode === "dark"
    ? props.mode
    : themeStore.isDark
      ? "dark"
      : "light",
);
const theme = computed(() => buildTheme(props.accent, safeMode.value));
const trimmed = computed(() => props.code.replace(/^\n+/, "").trimEnd());
const lines = computed<LineToken[][]>(() =>
  tokenizeLines(trimmed.value, props.language),
);
const highlighted = computed(() => new Set(props.highlightLines ?? []));
const gutterWidth = computed(() => `${String(lines.value.length).length}ch`);

const cssVars = computed(() => {
  const { colors } = theme.value;

  return {
    "--cb-accent": colors.accent,
    "--cb-bg": colors.bg,
    "--cb-border": colors.border,
    "--cb-header-bg": colors.headerBg,
    "--cb-plain": colors.plain,
    "--cb-muted": colors.muted,
    "--cb-gutter": colors.gutter,
    "--cb-hover-wash": colors.hoverWash,
    "--cb-float-bg": colors.floatBg,
    "--cb-selection": colors.selection,
    "--cb-line-wash": colors.lineWash,
  };
});

function tokenStyle(types: string[]) {
  return styleForTypes(theme.value, types);
}

// ---------------- 复制按钮 ----------------
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

async function copy() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(trimmed.value);
    } else {
      // 非安全上下文（无 Clipboard API）的回退
      const area = document.createElement("textarea");

      area.value = trimmed.value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  } catch {
    return;
  }
  copied.value = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    copied.value = false;
  }, COPY_RESET_MS);
}

const showHeaderBar = computed(() => props.showFrame && props.showHeader);
</script>

<template>
  <div
    :class="
      cn(
        'group relative flex flex-col overflow-hidden text-left',
        showFrame && 'rounded-2xl border border-(--cb-border) bg-(--cb-bg)',
        props.class,
      )
    "
    :style="cssVars"
    data-slot="code-block"
  >
    <div
      v-if="showHeaderBar"
      class="flex h-10 shrink-0 items-center gap-3 border-b border-(--cb-border) bg-(--cb-header-bg) px-3.5 backdrop-blur-md"
      data-slot="code-block-header"
    >
      <span aria-hidden="true" class="flex shrink-0 items-center gap-1.5">
        <span
          v-for="color in TRAFFIC_LIGHTS"
          :key="color"
          :style="{ backgroundColor: color }"
          class="size-3 rounded-full"
        />
      </span>
      <span class="min-w-0 flex-1 truncate font-mono text-xs text-(--cb-muted)">
        {{ filename ?? language }}
      </span>
      <button
        v-if="showCopyButton"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        :class="
          cn(
            'cb-copy relative grid size-7 place-items-center rounded-lg text-(--cb-gutter) outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-(--cb-hover-wash) hover:text-(--cb-plain) focus-visible:ring-2 focus-visible:ring-(--cb-accent)/60',
            !reduce && 'active:scale-90',
            copied &&
              'bg-(--cb-accent)/12 text-(--cb-accent) hover:bg-(--cb-accent)/12 hover:text-(--cb-accent)',
          )
        "
        data-slot="code-block-copy"
        type="button"
        @click="copy"
      >
        <Transition :name="reduce ? 'cb-fade' : 'cb-swap'">
          <span v-if="copied" key="check" class="col-start-1 row-start-1">
            <svg
              aria-hidden="true"
              :class="cn('size-3.5', !reduce && 'cb-check')"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </span>
          <span v-else key="copy" class="col-start-1 row-start-1">
            <UIcon class="size-3.5" name="i-lucide-copy" />
          </span>
        </Transition>
      </button>
    </div>

    <button
      v-if="!showHeaderBar && showCopyButton"
      :aria-label="copied ? 'Copied' : 'Copy code'"
      :class="
        cn(
          'cb-copy absolute top-2.5 right-2.5 z-10 grid size-7 place-items-center rounded-lg border border-(--cb-border) bg-(--cb-float-bg) text-(--cb-gutter) outline-none backdrop-blur-md transition-[background-color,color,transform] duration-150 ease-out hover:bg-(--cb-hover-wash) hover:text-(--cb-plain) focus-visible:ring-2 focus-visible:ring-(--cb-accent)/60',
          !reduce && 'active:scale-90',
          copied &&
            'bg-(--cb-accent)/12 text-(--cb-accent) hover:bg-(--cb-accent)/12 hover:text-(--cb-accent)',
        )
      "
      data-slot="code-block-copy"
      type="button"
      @click="copy"
    >
      <Transition :name="reduce ? 'cb-fade' : 'cb-swap'">
        <span v-if="copied" key="check" class="col-start-1 row-start-1">
          <svg
            aria-hidden="true"
            :class="cn('size-3.5', !reduce && 'cb-check')"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        </span>
        <span v-else key="copy" class="col-start-1 row-start-1">
          <UIcon class="size-3.5" name="i-lucide-copy" />
        </span>
      </Transition>
    </button>

    <!-- 可滚动区域需可聚焦以支持键盘滚动（WCAG 2.1.1） -->
    <div
      :aria-label="filename ?? `${language} code`"
      :class="
        cn(
          'min-h-0 flex-1 overflow-auto outline-none selection:bg-(--cb-selection) focus-visible:ring-2 focus-visible:ring-(--cb-accent)/40 [scrollbar-width:thin] [scrollbar-color:var(--cb-border)_transparent]',
          showFrame && 'py-3',
        )
      "
      data-slot="code-block-viewport"
      role="region"
      tabindex="0"
    >
      <pre
        class="w-max min-w-full font-mono text-[13px] leading-6 [tab-size:4]"
        data-slot="code-block-pre"
      ><div
          v-for="(line, i) in lines"
          :key="i"
          :class="
            cn(
              'relative flex min-w-full',
              showFrame && 'px-3.5',
              highlighted.has(i + 1) && 'bg-(--cb-line-wash)',
            )
          "
        ><span
            v-if="showLineNumbers"
            aria-hidden="true"
            :style="{ width: gutterWidth }"
            class="mr-4 shrink-0 text-right text-(--cb-gutter) select-none"
          >{{ i + 1 }}</span><span class="pr-3.5"><span
              v-for="(token, key) in line"
              :key="key"
              :style="tokenStyle(token.types)"
            >{{ token.content }}</span></span></div></pre>
    </div>
  </div>
</template>

<style scoped>
/* 图标切换：淡入 + 缩放 + 模糊（对齐 motion 的 swap spring），两图标叠于同一 grid 单元格 */
.cb-swap-enter-active {
  transition:
    opacity 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1),
    transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1),
    filter 0.3s ease-out;
}
.cb-swap-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in,
    filter 0.2s ease-in;
}
.cb-swap-enter-from,
.cb-swap-leave-to {
  opacity: 0;
  transform: scale(0.5);
  filter: blur(4px);
}
.cb-fade-enter-active,
.cb-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.cb-fade-enter-from,
.cb-fade-leave-to {
  opacity: 0;
}
/* 对勾描边（对齐 motion pathLength 0 → 1） */
.cb-check path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: cb-draw 0.2s ease-out 0.05s forwards;
}
@keyframes cb-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
