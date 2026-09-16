<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { useDemoActive } from '../use-demo-active'

import {
  buildTree,
  clamp01,
  COLOR_MS,
  drawScene,
  HOLD,
  readAverages,
  selfPaced,
  smoothstep,
  WAIT_CAP,
  type Scene
} from './grid-reveal-engine'

import { cn } from '@/lib/cn'

/**
 * 网格揭示（按 rare-ui `grid-reveal` 重写，MIT）：canvas 二分网格随进度拆分，图片落地后按均色揭示。
 * 与 React 端差异：说明条的淡出 / 文案切换 / 闪光以 CSS transition + `<Transition>` + keyframes 等效
 * （motion layout 宽度动画不做），零 npm 依赖。RAF 与观察器随 `useDemoActive` 暂停 / 重建。
 */
const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    /** 受控进度 0..1；不传则按 `estimatedDuration` 自走 */
    progress?: number
    aspect?: number
    caption?: string
    estimatedDuration?: number
    class?: string
  }>(),
  {
    src: null,
    alt: '',
    progress: undefined,
    aspect: 1,
    caption: undefined,
    estimatedDuration: 6000,
    class: undefined
  }
)

const emit = defineEmits<{ revealComplete: [], error: [] }>()

const SHIMMER = {
  backgroundImage:
    'linear-gradient(90deg, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.98) 50%, rgba(255,255,255,0.5) 60%)',
  backgroundSize: '250% 100%'
}

const reducedMotion = usePreferredReducedMotion()
const reduce = computed(() => reducedMotion.value === 'reduce')
const ratio = computed(() =>
  Number.isFinite(props.aspect) && props.aspect > 0 ? props.aspect : 1
)

const frameRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const active = useDemoActive()

const loaded = ref(false)
const revealed = ref(false)

watch(
  () => props.src,
  () => {
    loaded.value = false
    revealed.value = false
  }
)

watch(
  [active, reduce, () => props.src, ratio, frameRef, canvasRef],
  ([on, reduced, src, aspect, frame, canvas], _prev, onCleanup) => {
    if (!on || !frame || !canvas) return

    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const { root, branches } = buildTree(aspect)

    const scene: Scene = {
      ctx,
      root,
      width: 0,
      height: 0,
      scale: 1,
      dark: false,
      clock: 0,
      split: 0,
      fade: 0,
      hasColors: false,
      image: null
    }

    let loadedAt = -1
    let cancelled = false

    const render = (split: number, now: number) => {
      scene.dark = document.documentElement.classList.contains('dark')
      scene.split = split
      scene.fade = loadedAt < 0 ? 0 : smoothstep(0, COLOR_MS, now - loadedAt)
      drawScene(scene)
    }

    const repaint = () => {
      if (!reduced) return render(scene.split, performance.now())
      // 减弱动态效果下没有循环，直接跳到稳定帧
      const settled = loadedAt < 0 ? performance.now() : loadedAt + COLOR_MS

      render(scene.image ? 1 : WAIT_CAP, settled)
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = frame.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))

      scene.scale = dpr
      if (w === scene.width && h === scene.height) return
      scene.width = w
      scene.height = h
      canvas.width = w
      canvas.height = h
      // 改尺寸会清空画布，必须重绘
      repaint()
    }

    resize()
    const observer
      = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null

    observer?.observe(frame)

    const load = (url: string, withCors: boolean) => {
      const el = new Image()

      if (withCors) el.crossOrigin = 'anonymous'
      el.decoding = 'async'
      el.onload = () => {
        if (cancelled) return
        if (!el.naturalWidth || !el.naturalHeight) {
          emit('error')

          return
        }
        scene.image = el
        loadedAt = performance.now()
        scene.hasColors = readAverages(el, root, branches, scene.split)
        loaded.value = true
        if (reduced) repaint()
      }
      // 无 CORS 头的图源会拒绝请求，退回普通加载
      el.onerror = () => {
        if (cancelled) return
        if (withCors) load(url, false)
        else emit('error')
      }
      el.src = url
    }

    if (src) load(src, true)

    if (reduced) {
      repaint()
      onCleanup(() => {
        cancelled = true
        observer?.disconnect()
      })

      return
    }

    let frameId = 0
    let last = 0
    let elapsed = 0
    let eased = 0
    let split = 0
    let fired = false
    let stopped = false
    let visible = true

    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick)
      if (!last) last = now
      const dt = Math.min((now - last) / 1000, 0.05)

      last = now
      elapsed += dt
      scene.clock = elapsed

      const ready = scene.image !== null
      const paced = props.progress === undefined
      let target: number

      // 完成的信号是图片落地，而不是进度数字
      if (ready) {
        target = 1
      } else if (paced) {
        target = selfPaced(elapsed * 1000, props.estimatedDuration)
      } else {
        target = Math.min(clamp01(props.progress as number), HOLD)
      }

      eased += (target - eased) * (1 - Math.exp(-dt * 5.5))
      const wanted = Math.min(eased, ready ? 1 : WAIT_CAP)

      split += (wanted - split) * (1 - Math.exp(-dt * 4))
      render(split, now)

      if (!fired && ready && eased > 0.995 && now - loadedAt > COLOR_MS) {
        fired = true
        revealed.value = true
        emit('revealComplete')
      }

      // 此后不再有变化，停止烧帧
      if (fired && split > 0.9995) {
        render(1, now)
        stopped = true
        cancelAnimationFrame(frameId)
      }
    }

    const start = () => {
      if (stopped) return
      last = 0
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(tick)
    }

    // 不在视口内就不必动画
    const visibility
      = typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting === visible) return
              visible = entry.isIntersecting
              if (visible) start()
              else cancelAnimationFrame(frameId)
            },
            { rootMargin: '150px' }
          )
        : null

    visibility?.observe(frame)

    start()

    onCleanup(() => {
      cancelled = true
      cancelAnimationFrame(frameId)
      observer?.disconnect()
      visibility?.disconnect()
    })
  },
  { immediate: true }
)

watch([reduce, loaded], ([reduced, isLoaded]) => {
  if (reduced && isLoaded) emit('revealComplete')
})

const finished = computed(() => (reduce.value ? loaded.value : revealed.value))

const captionStyle = computed(() => {
  if (reduce.value) return undefined

  return finished.value ? { ...SHIMMER, animation: 'none' } : SHIMMER
})
</script>

<template>
  <div
    ref="frameRef"
    :class="
      cn(
        'relative w-full overflow-hidden rounded-2xl bg-elevated [corner-shape:squircle]',
        props.class
      )
    "
    :style="{ aspectRatio: ratio }"
    data-slot="grid-reveal"
  >
    <canvas
      ref="canvasRef"
      :aria-hidden="alt ? undefined : 'true'"
      :aria-label="alt || undefined"
      :role="alt ? 'img' : undefined"
      class="block h-full w-full"
    />

    <div
      v-if="caption"
      :class="
        cn(
          'pointer-events-none absolute bottom-3 left-3 flex h-6 items-center overflow-hidden rounded-full bg-black/45 px-2.5 backdrop-blur-md transition-opacity duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          finished && 'opacity-0'
        )
      "
    >
      <!--
        文案切换为并行进出（对齐 React 端 AnimatePresence popLayout）：生成期间百分比每 80ms 递增、
        key 随之变化，out-in 串行模式下旧文字淡出（0.14s）永远追不上变化频率，文字会一直不可见
      -->
      <Transition name="gr-text">
        <span
          :key="caption"
          :class="
            cn(
              'block whitespace-nowrap text-[11px] font-medium leading-6',
              reduce
                ? 'text-white/75'
                : 'gr-shimmer bg-clip-text text-transparent'
            )
          "
          :style="captionStyle"
        >
          {{ caption }}
        </span>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.gr-text-enter-active,
.gr-text-leave-active {
  transition: opacity 0.14s cubic-bezier(0.4, 0, 0.2, 1);
}
/* 离场文字脱离文档流（左侧对齐 px-2.5 内边距），新文字立即占位、二者并行淡入淡出 */
.gr-text-leave-active {
  position: absolute;
  left: 0.625rem;
}
.gr-text-enter-from,
.gr-text-leave-to {
  opacity: 0;
}
/* 闪光扫过（对齐 motion backgroundPosition 105% → -5%，1.6s + 0.5s 停顿循环） */
.gr-shimmer {
  animation: gr-shimmer 2.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes gr-shimmer {
  0% {
    background-position: 105% 0%;
  }
  76%,
  100% {
    background-position: -5% 0%;
  }
}
</style>
