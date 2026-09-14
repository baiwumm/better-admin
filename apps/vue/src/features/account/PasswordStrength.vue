<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { PASSWORD_MIN_LENGTH } from "@/lib/password-validation";

/**
 * 密码强度指示（5 档，对齐 React 端 password-strength）：5 段色条 + 档位文案。
 * 评分维度：长度（≥8 / ≥12）+ 字符多样性（大小写 / 数字 / 符号），
 * 长度不足策略下限（8 位，见 password-validation）直接判为最低档；未输入时不渲染。
 * 仅作视觉提示，是否合规以 zod 校验（getPasswordError）为准。
 */

const props = defineProps<{ password: string }>();

const { t } = useI18n();

/** 档位色条 / 文案颜色（弱 → error，中 → warning，较强 → primary，强 → success；Nuxt UI 语义色） */
const LEVEL_BAR = [
  "bg-error",
  "bg-error",
  "bg-warning",
  "bg-primary",
  "bg-success",
] as const;
const LEVEL_TEXT = [
  "text-error",
  "text-error",
  "text-warning",
  "text-primary",
  "text-success",
] as const;

/** 评分 0-4（-1 表示未输入） */
function scorePassword(password: string): number {
  if (!password) return -1;
  if (password.length < PASSWORD_MIN_LENGTH) return 0;

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

const level = computed(() => scorePassword(props.password));
</script>

<template>
  <div v-if="level >= 0" class="flex items-center gap-2">
    <div class="flex flex-1 gap-1">
      <div
        v-for="index in 5"
        :key="index"
        :class="[
          'h-1 flex-1 rounded-full transition-colors',
          index - 1 <= level ? LEVEL_BAR[level] : 'bg-accented',
        ]"
      />
    </div>
    <span :class="['shrink-0 text-xs', LEVEL_TEXT[level]]">
      {{ t(`features.account.password.strength.${level}`) }}
    </span>
  </div>
</template>
