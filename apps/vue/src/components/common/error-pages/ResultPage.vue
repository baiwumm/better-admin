<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

/**
 * Result 风格错误页（对齐 React 端 result-page.tsx）：对齐 Ant Design Result
 * 的信息结构与排版（插画 250px → 标题 24px/600 → 副标题 14px 次要色 → 操作区，
 * 整页居中、垂直水平双向），插画来源见各 Illustration*.vue 文件头。
 */
withDefaults(
  defineProps<{
    /** 错误标题（页面组件负责 t() 翻译） */
    title: string;
    /** 错误描述 */
    subTitle: string;
    /** 渲染形态：fullscreen 占满视口（错误跳转的独立页，默认）；
     *  embedded 撑满父容器高度（/exception/* 菜单页渲染于主体区，
     *  配合 AdminLayout 全宽白名单实现「贴边撑满、无滚动条」） */
    variant?: "fullscreen" | "embedded";
  }>(),
  { variant: "fullscreen" },
);

defineSlots<{
  /** Result 插画（纯装饰 SVG，语义由 title / subTitle 表达） */
  image: () => unknown;
  /** 操作区；缺省为「返回上一页 + 返回首页」双按钮 */
  actions?: () => unknown;
}>();

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div
    :class="variant === 'embedded' ? 'h-full' : 'h-dvh'"
    class="flex w-full flex-col items-center justify-center bg-default px-6 text-center text-default"
  >
    <!-- 插画：固定 250px 展示宽，小屏随容器收缩；embedded 下再限高（不超过
        视口一半），避免小窗口内容超过容器高度时重新出现滚动条 -->
    <div
      :class="
        variant === 'embedded' ? 'min-h-0 [&_svg]:max-h-[45vh]' : undefined
      "
      class="mx-auto w-62.5 max-w-full [&_svg]:h-auto [&_svg]:w-full"
    >
      <slot name="image" />
    </div>
    <h1 class="mt-6 text-2xl font-semibold">{{ title }}</h1>
    <p class="text-muted mt-2 text-sm leading-normal">{{ subTitle }}</p>
    <div class="mt-8 flex items-center justify-center gap-3">
      <slot name="actions">
        <UButton
          :label="t('common.goBack')"
          color="neutral"
          variant="outline"
          @click="router.back()"
        />
        <UButton :label="t('common.backHome')" to="/" />
      </slot>
    </div>
  </div>
</template>
