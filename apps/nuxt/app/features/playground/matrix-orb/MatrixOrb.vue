<script setup lang="ts">
import { useDevicePixelRatio } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { useDemoActive } from '../use-demo-active'

import type { MatrixOrbState } from './matrix-orb-types'

import { cn } from '@/lib/cn'

/**
 * 点阵光球（按 rare-ui `matrix-orb` 移植，MIT）：Canvas 2D，零 npm 依赖。
 * idle / listening / thinking 三态权重平滑混合、弹簧缩放；state / level 变更由循环内实时读取
 * 重新瞄准（不重启循环），size / color / dots / dpr 变更重建。RAF 随 `useDemoActive` 暂停 / 重建。
 */
const props = withDefaults(
  defineProps<{
    state?: MatrixOrbState
    /** 0..1 手动电平；不传则自动包络 */
    level?: number
    size?: number
    color?: string
    dots?: number
    labels?: Partial<Record<MatrixOrbState, string>>
    class?: string
  }>(),
  {
    state: 'idle',
    level: undefined,
    size: 240,
    color: '#F75001',
    dots: 11,
    labels: undefined,
    class: undefined
  }
)

const TAU = Math.PI * 2
const STATES: MatrixOrbState[] = ['idle', 'listening', 'thinking']

const LABELS: Record<MatrixOrbState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking'
}

const SCALE: Record<MatrixOrbState, number> = {
  idle: 0.88,
  listening: 1,
  thinking: 0.92
}

const STIFFNESS = 180
const DAMPING = 26
const ATTACK = 0.22
const RELEASE = 0.08
const BLEND = 0.16

const ORBITERS = [
  { radius: 0.62, speed: 2.2, phase: 0, spread: 0.42 },
  { radius: 0.4, speed: -1.7, phase: 2.1, spread: 0.36 },
  { radius: 0.8, speed: 1.15, phase: 4, spread: 0.34 }
]

// 不用 Math.abs：其拐角在每个波谷都会读成一次顿挫
function envelope(t: number) {
  const slow = 0.5 + 0.5 * Math.sin(t * 0.62 + 0.4)
  const fast = 0.5 + 0.5 * Math.sin(t * 1.9 + 1.1)

  return 0.22 + 0.78 * (0.45 + 0.55 * slow) * fast
}

function intensityOf(
  state: MatrixOrbState,
  d: number,
  nx: number,
  ny: number,
  t: number,
  amplitude: number
) {
  if (state === 'listening') {
    const ripple = 0.5 + 0.5 * Math.sin(d * 4.2 - t * 3)

    return 0.32 + amplitude * (0.34 + 0.38 * ripple)
  }

  if (state === 'thinking') {
    let heat = 0

    for (const o of ORBITERS) {
      const a = t * o.speed + o.phase
      const dx = nx - Math.cos(a) * o.radius
      const dy = ny - Math.sin(a) * o.radius

      heat += Math.exp(-(dx * dx + dy * dy) / (o.spread * o.spread))
    }

    return 0.26 + 0.8 * Math.min(1, heat)
  }

  return 0.62 + 0.12 * Math.sin(t * 1.05 - d * 2.4)
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const active = useDemoActive()
// 缩放会改变 devicePixelRatio，旧缓冲会被放大出锯齿
const { pixelRatio } = useDevicePixelRatio()
const dpr = computed(() => Math.min(pixelRatio.value || 1, 4))

/** 减弱动态效果下的静态重绘入口（state / level 变化时调用） */
let redraw: (() => void) | null = null

watch(
  [
    active,
    () => props.size,
    () => props.color,
    () => props.dots,
    dpr,
    canvasRef
  ],
  ([on, size, color, dots, ratio, canvas], _prev, onCleanup) => {
    const ctx = canvas?.getContext('2d')

    if (!on || !canvas || !ctx) return

    // 按 buffer/size 而非 dpr 缩放：取整后变换仍精确
    const buffer = Math.round(size * ratio)

    canvas.width = canvas.height = buffer
    ctx.scale(buffer / size, buffer / size)
    ctx.fillStyle = color

    const grid = Math.max(3, Math.round(dots))
    const half = (grid - 1) / 2
    const spacing = (size * 0.74) / (grid - 1)
    const maxRadius = spacing * 0.6
    const center = size / 2

    const weights: Record<MatrixOrbState, number> = {
      idle: 0,
      listening: 0,
      thinking: 0
    }

    weights[props.state] = 1

    // 非有限的 level 会永远卡在平滑器里
    const levelAt = (t: number) => {
      const v = props.level

      return v === undefined || !Number.isFinite(v)
        ? envelope(t)
        : Math.min(1, Math.max(0, v))
    }

    const draw = (t: number, amplitude: number, scale: number) => {
      ctx.clearRect(0, 0, size, size)

      for (let iy = 0; iy < grid; iy++) {
        for (let ix = 0; ix < grid; ix++) {
          const nx = (ix - half) / half
          const ny = (iy - half) / half
          const d = Math.hypot(nx, ny)

          // 1.12 而非方形对角的 1.41：轮廓才是圆的
          if (d > 1.12) continue

          let blended = 0

          for (const s of STATES) {
            if (weights[s] < 0.001) continue
            blended += weights[s] * intensityOf(s, d, nx, ny, t, amplitude)
          }

          const intensity = Math.min(1, Math.max(0, blended))
          const radius = maxRadius * Math.exp(-d * d * 1.7) * intensity * scale

          // 不足半个设备像素渲染成雾而非点
          if (radius * ratio < 0.5) continue

          ctx.beginPath()
          ctx.arc(
            center + (ix - half) * spacing * scale,
            center + (iy - half) * spacing * scale,
            radius,
            0,
            TAU
          )
          ctx.fill()
        }
      }
    }

    const reduce
      = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      redraw = () => {
        const current = props.state

        for (const s of STATES) weights[s] = s === current ? 1 : 0
        draw(0, levelAt(0), SCALE[current])
      }
      redraw()
      onCleanup(() => {
        redraw = null
      })

      return
    }

    let t = 0
    let amplitude = 0
    let scale = SCALE[props.state]
    let velocity = 0
    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)

      last = now
      t += dt

      const current = props.state
      const target = levelAt(t)
      const rate = target > amplitude ? ATTACK : RELEASE

      amplitude += (target - amplitude) * (1 - Math.pow(1 - rate, dt * 60))

      // 逐态权重：中途切换从当前画面平滑混合
      const step = 1 - Math.pow(1 - BLEND, dt * 60)

      for (const s of STATES) {
        weights[s] += ((s === current ? 1 : 0) - weights[s]) * step
      }

      velocity
        += (-STIFFNESS * (scale - SCALE[current]) - DAMPING * velocity) * dt
      scale += velocity * dt

      draw(t, amplitude, scale)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    onCleanup(() => cancelAnimationFrame(raf))
  },
  { immediate: true }
)

watch([() => props.state, () => props.level], () => {
  redraw?.()
})

const label = computed(
  () => props.labels?.[props.state] ?? LABELS[props.state]
)
</script>

<template>
  <div
    :class="cn('flex flex-col items-center gap-3', props.class)"
    :data-state="state"
    data-slot="matrix-orb"
  >
    <canvas
      ref="canvasRef"
      :style="{ width: `${size}px`, height: `${size}px` }"
      aria-hidden="true"
      class="block"
    />
    <span
      aria-live="polite"
      class="text-sm text-muted"
      role="status"
    >
      {{ label }}
    </span>
  </div>
</template>
