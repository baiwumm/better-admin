<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { FACES, FADE, LINE, mod } from "./animated-counter-utils";

/**
 * 单个数字滚轮列（按 rare-ui `animated-counter` 的 Digit 重写）。
 * React 端用 motion value 每帧对位置取 mod、11 面轮（0-9 + 尾 0）无缝回绕；
 * CSS transition 无法逐帧取 mod，改为 **30 面轮（三组 0-9）+ 位置区间 [-10, 20)**：
 * 目标位置按方向取最短 / 最长路径（反向时绕远路，与上游一致），transitionend 后
 * 关闭过渡、把位置归一化回 [0, 10)，下一帧再恢复过渡——视觉连续、无跳变。
 */
const props = defineProps<{
  digit: number;
  /** 首帧起始面（挂载时的数字；后出现的列从 0 滚入） */
  from: number;
  /** 变化方向：1 递增 / -1 递减（反向时滚轮绕远路） */
  dir: number;
  /** 滚动时长（秒） */
  duration: number;
  reduced: boolean;
}>();

const WHEEL = [...FACES, ...FACES, ...FACES];
/** 位置 → 轮面索引偏移（位置 -10 对应第 0 面） */
const OFFSET = 10;

const pos = ref(props.from);
const transitioning = ref(!props.reduced);

/** 瞄准目标面：以当前目标为起点，按方向取路径（反向绕远路）。 */
function aim(digit: number, reduced: boolean) {
  if (reduced) {
    transitioning.value = false;
    pos.value = digit;

    return;
  }
  // 只在面变化时重新瞄准
  if (mod(pos.value, 10) === digit) return;
  const at = pos.value;

  transitioning.value = true;
  pos.value =
    props.dir < 0 ? at - mod(at - digit, 10) : at + mod(digit - at, 10);
}

watch(
  () => [props.digit, props.reduced] as const,
  ([digit, reduced]) => aim(digit, reduced),
);

// 首帧先绘制 from 面，下一帧再瞄准：新出现的列从 from 滚入目标（对齐 React 端 motion 挂载即动画）
onMounted(() => {
  requestAnimationFrame(() => aim(props.digit, props.reduced));
});

/** 过渡结束：位置越界时无动画地归一化回 [0, 10)。 */
async function onTransitionEnd() {
  if (pos.value >= 0 && pos.value < 10) return;
  transitioning.value = false;
  pos.value = mod(pos.value, 10);
  await nextTick();
  // 让浏览器先提交无过渡的 transform，再恢复过渡
  requestAnimationFrame(() => {
    transitioning.value = !props.reduced;
  });
}

const wheelStyle = computed(() => ({
  transform: `translateY(${(-(pos.value + OFFSET) * 100) / WHEEL.length}%)`,
  transition: transitioning.value
    ? `transform ${props.duration}s cubic-bezier(0.34, 1.25, 0.64, 1)`
    : "none",
}));

const columnStyle = {
  height: `${LINE}em`,
  lineHeight: String(LINE),
  maskImage: FADE,
  WebkitMaskImage: FADE,
};

const faceStyle = { height: `${LINE}em` };
</script>

<template>
  <span
    :style="columnStyle"
    class="relative inline-grid overflow-hidden"
    data-slot="animated-counter-digit"
  >
    <!-- 最宽面占位：无等宽数字的字体也能稳定列宽 -->
    <span
      v-for="face in FACES"
      :key="face"
      aria-hidden="true"
      class="invisible [grid-area:1/1]"
      >{{ face }}</span
    >
    <span
      :style="wheelStyle"
      class="absolute inset-x-0 top-0 will-change-transform"
      @transitionend.self="onTransitionEnd"
    >
      <span
        v-for="(face, index) in WHEEL"
        :key="index"
        :style="faceStyle"
        class="flex items-center justify-center"
        >{{ face }}</span
      >
    </span>
  </span>
</template>
