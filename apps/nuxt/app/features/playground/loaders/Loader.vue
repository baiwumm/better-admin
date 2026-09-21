<script setup lang="ts">
/**
 * Vendor 自 beUI（MIT）`loader`，快照来源 https://beui.dev/r/loader.json（2026-09-21）。
 * 自 Vue 端 `apps/vue/src/features/playground/loaders/Loader.vue`（`a8899d9`）平移。
 *
 * 本地改动：`cn` 改自 `@/lib/cn`；着色 token 用 Nuxt UI 的 `text-default`；
 * **motion 关键帧全部改 CSS `@keyframes` 等效**（§21 端内约定不引入 motion-v）——
 * 几何仍由 `size` 逐条计算（与 React 端同公式），动画时长 / 延时 / 缓动经
 * `--dur` / `--d` / `--jump` 等自定义属性下发，`EASE_IN_OUT` 即上游 lib/ease.ts
 * 的强缓动曲线 `cubic-bezier(0.77, 0, 0.175, 1)`。
 * JS 驱动的三类（ASCII 换字 / scramble / percent）改 `setInterval` +
 * `useDemoActive`（KeepAlive 切走即停，对齐端内其它演示组件口径）。
 *
 * 与 React 端的两处行为差异：
 * 1. React 因「motion 对循环中的动画不应用新 transition」必须 `key={speed}` 重挂载
 *    重启；CSS 动画改 `animation-duration` 即时生效，故本端不需要重挂载钩子。
 * 2. reduced-motion 下 metaballs 两球的「合拢姿态」改由 CSS 媒体查询的静止
 *    `transform` 位移达成（React 端在模板里读 `useReducedMotion` 改 `cx`，Vue 端
 *    亦如此）——本端是 SSR，模板读媒体查询会让服务端首帧与客户端水合渲染取值不同
 *    （SSR 侧恒为「不减弱」），故把这一处降级挪进 CSS；`cx` 因此固定 30 / 70。
 *    ASCII / scramble / percent 的降级走脚本侧，其 watch 在 SSR 阶段不触发。
 */
import { usePreferredReducedMotion } from '@vueuse/core'
import { type CSSProperties, computed, ref, useId, watch } from 'vue'

import { cn } from '@/lib/cn'

import { useDemoActive } from '../use-demo-active'

import type { LoaderVariant } from './loader-variants'

const props = withDefaults(
  defineProps<{
    /** 渲染哪一种动画。 */
    variant?: LoaderVariant
    /** 基准方形尺寸（px），一切几何由它派生。 */
    size?: number
    /** 一个动画周期的秒数。 */
    speed?: number
    /** 读屏播报的可访问名称。 */
    label?: string
    class?: string
  }>(),
  {
    variant: 'spinner',
    size: 32,
    speed: 1,
    label: 'Loading',
    class: undefined
  }
)

const reducedMotion = usePreferredReducedMotion()
const reduce = computed(() => reducedMotion.value === 'reduce')

/* ---------------------------------------------------------------- 几何派生 */

/** spinner：笔画粗细与半径（`max(2, …)` 兜住极小尺寸下笔画消失）。 */
const stroke = computed(() => Math.max(2, props.size * 0.09))
const ringR = computed(() => (props.size - stroke.value) / 2)
const ringPath = computed(() => {
  const half = props.size / 2
  const r = ringR.value

  return `M ${half} ${half - r} A ${r} ${r} 0 0 1 ${half + r} ${half}`
})

/** dots：三点直径 / 间距 / 起跳高度。 */
const dotSize = computed(() => props.size * 0.24)
const dotGap = computed(() => props.size * 0.14)
const dotJump = computed(() => props.size * 0.3)

/** bars：四柱宽度与间距。 */
const barWidth = computed(() => props.size * 0.16)

/** dot-matrix：3×3 点阵，按「离角距离」做对角波延迟。 */
const MX_N = 3
const mxGap = computed(() => props.size * 0.14)
const mxDot = computed(() => (props.size - mxGap.value * (MX_N - 1)) / MX_N)
const mxCells = computed(() =>
  Array.from({ length: MX_N * MX_N }, (_, idx) => ({
    idx,
    delay: (idx % MX_N + Math.floor(idx / MX_N)) / (2 * (MX_N - 1))
  }))
)

/**
 * dither：4×4 点按 Bayer 阈值序点亮（经典抖动图案，故填充像半色调溶解）。
 * 数组是常量，放模块作用域。
 */
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const DT_N = 4
const dtGap = computed(() => Math.max(1, props.size * 0.05))
const dtCell = computed(() => (props.size - dtGap.value * (DT_N - 1)) / DT_N)
const dtCells = computed(() =>
  BAYER_4.map((order, idx) => ({ idx, delay: order / BAYER_4.length }))
)

/** comet：头核直径、轨道半径与六段尾迹（越靠后越小越淡）。 */
const COMET_TRAIL = [0, 1, 2, 3, 4, 5]
const cometHead = computed(() => props.size * 0.2)
const cometTrail = computed(() => {
  const head = cometHead.value
  const r = props.size / 2 - head / 2

  return COMET_TRAIL.map(i => ({
    i,
    cell: head * (1 - i * 0.13),
    opacity: 1 - i * 0.16,
    transform: `rotate(${-i * 15}deg) translateY(${-r}px)`
  }))
})

/** metaballs：融合滤镜 id（`useId()` 保证同一 app 实例内唯一，同页多实例不撞）。 */
const ballFilter = `ld-metaballs-${useId()}`

/** newton：球径与摆幅；只有两端球移动，中间三球静止，冲击看似穿过它们。 */
const newtonD = computed(() => props.size * 0.2)
const newtonOut = computed(() => newtonD.value * 1.1)
const NEWTON_BALLS = [0, 1, 2, 3, 4]

/** helix：七行双点，行延迟铺出螺旋相位。 */
const HELIX_ROWS = 7
const helixDot = computed(() => props.size * 0.14)
const helixAmp = computed(() => props.size * 0.32)
const helixRows = computed(() =>
  Array.from({ length: HELIX_ROWS }, (_, r) => ({
    r,
    top: (r / (HELIX_ROWS - 1)) * (props.size - helixDot.value),
    left: props.size / 2 - helixDot.value / 2,
    delay: r / HELIX_ROWS
  }))
)

/** percent：文案与进度条尺寸。 */
const percentText = computed(() => props.size * 0.42)
const percentBar = computed(() => Math.max(3, props.size * 0.1))

/* ------------------------------------------------------- morph 形状顶点集 */

/**
 * 每个形状按同一采样点数生成多边形，clip-path 在「点数相同」的前提下可跨形状
 * 可靠插值（React 端因 framer 对 polygon 插值不可靠而改走 SVG path tween，
 * 本端反过来用 polygon——CSS 动画无需 JS 逐帧驱动）。
 */
const MORPH_POINTS = 24

function ngonRadius(ang: number, n: number, phase = 0): number {
  const seg = (2 * Math.PI) / n
  const a = ang - phase
  const local = (((a % seg) + seg) % seg) - seg / 2

  return Math.cos(Math.PI / n) / Math.cos(local)
}

function morphPolygon(radiusAt: (ang: number) => number): string {
  const parts: string[] = []

  for (let i = 0; i < MORPH_POINTS; i++) {
    const ang = (i / MORPH_POINTS) * 2 * Math.PI - Math.PI / 2
    const r = Math.min(1.05, radiusAt(ang))
    const x = (50 + Math.cos(ang) * 46 * r).toFixed(2)
    const y = (50 + Math.sin(ang) * 46 * r).toFixed(2)

    parts.push(`${x}% ${y}%`)
  }

  return `polygon(${parts.join(', ')})`
}

/** 圆 / 方 / 三角 / 六角 / 菱形，常量放模块作用域避免逐实例重算。 */
const MORPH_SHAPES = [
  morphPolygon(() => 1),
  morphPolygon(a => ngonRadius(a, 4, Math.PI / 4)),
  morphPolygon(a => ngonRadius(a, 3)),
  morphPolygon(a => ngonRadius(a, 6)),
  morphPolygon(a => ngonRadius(a, 4))
]

/** 下发给 `@keyframes ld-morph` 的五个形状变量（自定义属性走 style 对象透传）。 */
const morphVars = {
  '--s0': MORPH_SHAPES[0],
  '--s1': MORPH_SHAPES[1],
  '--s2': MORPH_SHAPES[2],
  '--s3': MORPH_SHAPES[3],
  '--s4': MORPH_SHAPES[4]
} as CSSProperties

/* -------------------------------------------------------------- JS 驱动型 */

/** 终端风格帧集——加载器 CLI 里 AI agent 轮转的那几组字符。 */
const ASCII_SETS: Record<string, string[]> = {
  'ascii': ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  'ascii-line': ['|', '/', '-', '\\'],
  'ascii-braille': ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
  'ascii-blocks': [
    '▁',
    '▂',
    '▃',
    '▄',
    '▅',
    '▆',
    '▇',
    '█',
    '▇',
    '▆',
    '▅',
    '▄',
    '▃',
    '▂'
  ],
  'ascii-bounce': ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈']
}

const asciiFrames = computed(() => ASCII_SETS[props.variant] ?? null)
const asciiFrame = ref(0)
const asciiGlyph = computed(() => {
  const frames = asciiFrames.value

  return frames ? (frames[asciiFrame.value % frames.length] ?? '') : ''
})

const SCRAMBLE_TARGET = 'LOADING'
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/*#@'
const scrambleText = ref(SCRAMBLE_TARGET)

const percentValue = ref(0)

const active = useDemoActive()

// ASCII 系：减弱动态效果下只是放慢周期而非停摆——换字不属于屏动。
watch(
  [active, reduce, () => props.speed, asciiFrames],
  ([on, red, speed, frames], _prev, onCleanup) => {
    if (!on || !frames)
      return

    const step = ((red ? speed * 2.5 : speed) / frames.length) * 1000
    const timer = setInterval(() => {
      asciiFrame.value = (asciiFrame.value + 1) % frames.length
    }, step)

    onCleanup(() => clearInterval(timer))
  }
)

// scramble：逐字「解码」到位后整体重来；减弱动态效果下直接显示稳定文案。
// variant 入依赖并做早退，切走变体即随 onCleanup 停表（React 端靠子组件卸载）。
watch(
  [active, reduce, () => props.speed, () => props.variant],
  ([on, red, speed], _prev, onCleanup) => {
    if (red) {
      scrambleText.value = SCRAMBLE_TARGET

      return
    }
    if (!on || props.variant !== 'scramble')
      return

    let tick = 0
    const total = SCRAMBLE_TARGET.length + 4
    const timer = setInterval(
      () => {
        const reveal = tick % total
        let next = ''

        for (let i = 0; i < SCRAMBLE_TARGET.length; i++) {
          next
            += i < reveal
              ? SCRAMBLE_TARGET[i]
              : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]
        }
        scrambleText.value = next
        tick++
      },
      (speed / SCRAMBLE_TARGET.length) * 1000 * 0.55
    )

    onCleanup(() => clearInterval(timer))
  }
)

// percent：线性推进到 100 后归零循环（40ms 一拍与 React 端同口径）。
watch(
  [active, reduce, () => props.speed, () => props.variant],
  ([on, red, speed], _prev, onCleanup) => {
    if (!on || props.variant !== 'percent')
      return

    const duration = (red ? speed * 2 : speed) * 1000
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += 40

      const next = Math.min(100, Math.round((elapsed / duration) * 100))

      percentValue.value = next
      if (next >= 100)
        elapsed = 0
    }, 40)

    onCleanup(() => clearInterval(timer))
  }
)
</script>

<template>
  <span
    :aria-label="label"
    :class="
      cn('inline-flex items-center justify-center text-default', props.class)
    "
    :style="{ '--dur': `${speed}s` }"
    role="status"
  >
    <!-- spinner：底环 20% 透明度 + 四分之一弧随整体匀速转 -->
    <svg
      v-if="variant === 'spinner'"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      :width="size"
      class="ld-a ld-spin"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="ringR"
        :stroke-width="stroke"
        fill="none"
        stroke="currentColor"
        stroke-opacity="0.2"
      />
      <path
        :d="ringPath"
        :stroke-width="stroke"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
      />
    </svg>

    <!-- dots：三点上下跳，相位差 0.16 周期 -->
    <span
      v-else-if="variant === 'dots'"
      :style="{ gap: `${dotGap}px` }"
      class="flex items-center"
    >
      <span
        v-for="i in [0, 1, 2]"
        :key="i"
        :style="{
          '--d': i * 0.16,
          '--jump': `${dotJump}px`,
          'height': `${dotSize}px`,
          'width': `${dotSize}px`
        }"
        class="ld-a ld-bounce bg-current rounded-full"
      />
    </span>

    <!-- bars：四柱自底向上伸缩，相位差 0.12 周期 -->
    <span
      v-else-if="variant === 'bars'"
      :style="{ gap: `${size * 0.1}px`, height: `${size}px` }"
      class="flex items-center"
    >
      <span
        v-for="i in [0, 1, 2, 3]"
        :key="i"
        :style="{
          '--d': i * 0.12,
          'height': `${size}px`,
          'width': `${barWidth}px`
        }"
        class="ld-a ld-grow bg-current rounded-full"
      />
    </span>

    <!-- dot-matrix：3×3 对角波（透明度 + 缩放） -->
    <span
      v-else-if="variant === 'dot-matrix'"
      :style="{
        gap: `${mxGap}px`,
        gridTemplateColumns: `repeat(${MX_N}, ${mxDot}px)`
      }"
      class="grid"
    >
      <span
        v-for="cell in mxCells"
        :key="cell.idx"
        :style="{
          '--d': cell.delay,
          'height': `${mxDot}px`,
          'width': `${mxDot}px`
        }"
        class="ld-a ld-matrix bg-current rounded-full"
      />
    </span>

    <!-- dither：4×4 按 Bayer 阈值序点亮 -->
    <span
      v-else-if="variant === 'dither'"
      :style="{
        gap: `${dtGap}px`,
        gridTemplateColumns: `repeat(${DT_N}, ${dtCell}px)`
      }"
      class="grid"
    >
      <span
        v-for="cell in dtCells"
        :key="cell.idx"
        :style="{
          '--d': cell.delay,
          'height': `${dtCell}px`,
          'width': `${dtCell}px`
        }"
        class="ld-a ld-dither bg-current"
      />
    </span>

    <!-- morph：五种多边形逐顶点插值轮转，每形状「成形后停留」再进下一态 -->
    <span
      v-else-if="variant === 'morph'"
      :style="[morphVars, { height: `${size}px`, width: `${size}px` }]"
      class="ld-a ld-morph bg-current"
    />

    <!-- comet：六段尾迹挂在自转容器上，尾迹自身按角度散开 -->
    <span
      v-else-if="variant === 'comet'"
      :style="{ height: `${size}px`, width: `${size}px` }"
      class="relative"
    >
      <span class="ld-a ld-spin absolute inset-0">
        <span
          v-for="dot in cometTrail"
          :key="dot.i"
          :style="{
            height: `${dot.cell}px`,
            opacity: dot.opacity,
            transform: dot.transform,
            width: `${dot.cell}px`
          }"
          class="bg-current absolute top-1/2 left-1/2 rounded-full"
        />
      </span>
    </span>

    <!-- scramble：随机字逐位解码成 LOADING -->
    <span
      v-else-if="variant === 'scramble'"
      :style="{ fontSize: `${size * 0.42}px` }"
      class="font-mono font-medium tracking-[0.2em] tabular-nums"
    >{{ scrambleText }}</span>

    <!-- metaballs：高斯模糊 + 通道矩阵阈值化，两球往复即「融合再分离」；
         减弱动态效果下的合拢姿态见样式末尾媒体查询 -->
    <svg
      v-else-if="variant === 'metaballs'"
      :height="size"
      :viewBox="'0 0 100 100'"
      :width="size"
      role="img"
    >
      <title>Loading</title>
      <defs>
        <filter :id="ballFilter">
          <feGaussianBlur
            in="SourceGraphic"
            result="b"
            stdDeviation="5"
          />
          <feColorMatrix
            in="b"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
        </filter>
      </defs>
      <g
        :filter="`url(#${ballFilter})`"
        fill="currentColor"
      >
        <circle
          cx="30"
          cy="50"
          r="15"
          class="ld-a ld-ball-a"
          style="--amp: 40px"
        />
        <circle
          cx="70"
          cy="50"
          r="15"
          class="ld-a ld-ball-b"
          style="--amp: -40px"
        />
      </g>
    </svg>

    <!-- newton：只动两端小球，中间三球静止，冲击看似穿过它们 -->
    <span
      v-else-if="variant === 'newton'"
      :style="{ height: `${newtonD}px` }"
      class="flex items-center justify-center"
    >
      <span
        v-for="i in NEWTON_BALLS"
        :key="i"
        :class="
          cn(
            'bg-current rounded-full',
            i === 0 && 'ld-a ld-newton-a',
            i === 4 && 'ld-a ld-newton-b'
          )
        "
        :style="{
          '--out': `${newtonOut}px`,
          'height': `${newtonD}px`,
          'width': `${newtonD}px`
        }"
      />
    </span>

    <!-- helix：双列点反相横移 + 缩放，行延迟铺出螺旋 -->
    <span
      v-else-if="variant === 'helix'"
      :style="{ height: `${size}px`, width: `${size}px` }"
      class="relative"
    >
      <template
        v-for="row in helixRows"
        :key="row.r"
      >
        <span
          :style="{
            '--amp': `${helixAmp}px`,
            '--d': row.delay,
            'height': `${helixDot}px`,
            'left': `${row.left}px`,
            'top': `${row.top}px`,
            'width': `${helixDot}px`
          }"
          class="ld-a ld-helix-a bg-current absolute rounded-full"
        />
        <span
          :style="{
            '--amp': `${helixAmp}px`,
            '--d': row.delay,
            'height': `${helixDot}px`,
            'left': `${row.left}px`,
            'top': `${row.top}px`,
            'width': `${helixDot}px`
          }"
          class="ld-a ld-helix-b bg-current absolute rounded-full"
        />
      </template>
    </span>

    <!-- percent：计数文案 + 同步填充的进度条 -->
    <span
      v-else-if="variant === 'percent'"
      :style="{ gap: `${size * 0.14}px`, width: `${size * 1.4}px` }"
      class="flex flex-col items-center"
    >
      <span
        :style="{ fontSize: `${percentText}px`, lineHeight: 1 }"
        class="font-mono font-medium tabular-nums"
      >{{ percentValue }}%</span>
      <span
        :style="{ height: `${percentBar}px` }"
        class="bg-current/15 w-full overflow-hidden rounded-full"
      >
        <span
          :style="{ width: `${percentValue}%` }"
          class="bg-current block h-full rounded-full"
        />
      </span>
    </span>

    <!-- ASCII 系：按帧轮转终端字符 -->
    <span
      v-else-if="asciiFrames"
      :style="{ fontSize: `${size}px`, lineHeight: 1 }"
      class="font-mono leading-none tabular-nums"
    >{{ asciiGlyph }}</span>

    <span class="sr-only">{{ label }}</span>
  </span>
</template>

<style scoped>
/* 公共底：周期由根节点 --dur 下发（改 duration 即时生效，无需重挂载），
   相位差按 --d × 周期计算，缓动一律上游 EASE_IN_OUT 的强曲线。 */
.ld-a {
  animation-delay: calc(var(--dur) * var(--d, 0));
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1);
}

@keyframes ld-spin {
  to {
    transform: rotate(360deg);
  }
}
.ld-spin {
  animation-duration: var(--dur);
  animation-name: ld-spin;
  animation-timing-function: linear;
}

@keyframes ld-bounce {
  0%,
  100% {
    opacity: 0.5;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(calc(var(--jump) * -1));
  }
}
.ld-bounce {
  animation-duration: var(--dur);
  animation-name: ld-bounce;
}

@keyframes ld-grow {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}
.ld-grow {
  animation-duration: var(--dur);
  animation-name: ld-grow;
  transform-origin: bottom;
}

@keyframes ld-matrix {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.7);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
.ld-matrix {
  animation-duration: var(--dur);
  animation-name: ld-matrix;
}

@keyframes ld-dither {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 1;
  }
}
.ld-dither {
  animation-duration: var(--dur);
  animation-name: ld-dither;
}

/* morph：11 个停点（每形状连续两停 = 成形后停留），旋转与缩放只在形态
   切换段变化，故停稳的形状是静止的——与 React 端 MORPH_SEQ / ROT / SCALE 同表。 */
@keyframes ld-morph {
  0%,
  10% {
    clip-path: var(--s0);
    transform: rotate(0deg) scale(1);
  }
  20%,
  30% {
    clip-path: var(--s1);
    transform: rotate(72deg) scale(0.88);
  }
  40%,
  50% {
    clip-path: var(--s2);
    transform: rotate(144deg) scale(1);
  }
  60%,
  70% {
    clip-path: var(--s3);
    transform: rotate(216deg) scale(0.88);
  }
  80%,
  90% {
    clip-path: var(--s4);
    transform: rotate(288deg) scale(1);
  }
  100% {
    clip-path: var(--s0);
    transform: rotate(360deg) scale(1);
  }
}
.ld-morph {
  clip-path: var(--s0);
  animation-duration: calc(var(--dur) * 5);
  animation-name: ld-morph;
}

@keyframes ld-ball {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(var(--amp));
  }
}
/* SVG 子元素的 px 即 viewBox 用户单位（0..100），故位移不随 size 缩放；
   两球共用一套 keyframes，方向由各自的 --amp 正负决定。 */
.ld-ball-a,
.ld-ball-b {
  animation-duration: calc(var(--dur) * 1.6);
  animation-name: ld-ball;
}

@keyframes ld-newton-a {
  0%,
  50%,
  100% {
    transform: translateX(0);
  }
  28% {
    transform: translateX(calc(var(--out) * -1));
  }
}
@keyframes ld-newton-b {
  0%,
  50%,
  100% {
    transform: translateX(0);
  }
  78% {
    transform: translateX(var(--out));
  }
}
.ld-newton-a,
.ld-newton-b {
  animation-duration: calc(var(--dur) * 1.5);
}
.ld-newton-a {
  animation-name: ld-newton-a;
}
.ld-newton-b {
  animation-name: ld-newton-b;
}

@keyframes ld-helix-a {
  0%,
  100% {
    opacity: 1;
    transform: translateX(var(--amp)) scale(1);
  }
  50% {
    opacity: 0.45;
    transform: translateX(calc(var(--amp) * -1)) scale(0.5);
  }
}
@keyframes ld-helix-b {
  0%,
  100% {
    opacity: 0.45;
    transform: translateX(calc(var(--amp) * -1)) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateX(var(--amp)) scale(1);
  }
}
.ld-helix-a {
  animation-duration: var(--dur);
  animation-name: ld-helix-a;
}
.ld-helix-b {
  animation-duration: var(--dur);
  animation-name: ld-helix-b;
}

/* 减弱动态效果：一律降级为缓慢的透明度呼吸，丢弃全部 transform / clip-path
   动画（React 端 REDUCED 常量同款 1.4s）；ASCII 三类的减速在脚本侧处理。
   metaballs 额外用静止位移把两球合拢（等价 React 端 reduce 时的 cx 40 / 60），
   呼吸动画不触碰 transform，故基底位移与呼吸可叠加。 */
@keyframes ld-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ld-a {
    animation: ld-breathe 1.4s cubic-bezier(0.77, 0, 0.175, 1) infinite;
    animation-delay: calc(var(--dur) * var(--d, 0));
  }
  .ld-ball-a {
    transform: translateX(10px);
  }
  .ld-ball-b {
    transform: translateX(-10px);
  }
}
</style>
