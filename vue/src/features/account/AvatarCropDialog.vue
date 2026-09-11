<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMutation } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

import { getAccountErrorMessage, uploadAccountAvatar } from "./account-api";
import { toAvatarWebpBlob } from "./crop-image";

/**
 * 头像裁剪弹窗（对齐 React 端 avatar-crop-dialog）：vue-advanced-cropper 固定正方形
 * 裁剪框 + 拖动图片 + 缩放滑杆 + 90° 旋转 → getResult().canvas 缩放为 256×256 WebP →
 * FormData 上传（POST /account/avatar，服务端中转 Supabase Storage）。
 * imageSrc 由父组件以 objectURL 传入，关闭弹窗时由父组件统一 revoke。
 *
 * 缩放只经滑杆控制（关闭滚轮 / 触摸缩放），保证滑杆读数与图像倍率一致：
 * 裁剪库的 zoom(factor) 是相对倍率，滑杆变更换算为「目标 / 当前」再下发。
 */

const open = defineModel<boolean>("open", { required: true });

defineProps<{
  /** 待裁剪图片 objectURL（父组件负责创建与释放） */
  imageSrc: string | null;
}>();

const emit = defineEmits<{
  /** 上传成功（参数为服务端返回的带时间戳头像 URL） */
  uploaded: [avatar: string];
}>();

const { t } = useI18n();
const toast = useToast();

/** 缩放范围（相对适配尺寸的倍率） */
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
/** 旋转步长（±90°） */
const ROTATION_STEP = 90;
/** 裁剪框固定尺寸（弹窗内 h-72 预览区居中） */
const STENCIL_SIZE = { width: 240, height: 240 };

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null);
const zoom = ref(ZOOM_MIN);

// 重开弹窗复位滑杆（Cropper 随 v-if 重建，自身状态天然复位）
watch(open, (isOpen) => {
  if (isOpen) zoom.value = ZOOM_MIN;
});

function onZoomChange(value: number | number[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined) return;

  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw));

  cropperRef.value?.zoom(next / zoom.value);
  zoom.value = next;
}

function rotate(step: number) {
  cropperRef.value?.rotate(step);
}

const mutation = useMutation({
  mutationFn: async () => {
    const canvas = cropperRef.value?.getResult().canvas;

    if (!canvas) {
      throw new Error(t("features.account.avatar.notReady"));
    }

    return uploadAccountAvatar(await toAvatarWebpBlob(canvas));
  },
  onSuccess: (result) => {
    toast.add({
      color: "success",
      title: t("features.account.avatar.uploadSuccess"),
    });
    emit("uploaded", result.avatar);
    open.value = false;
  },
  onError: (error) => {
    toast.add({ color: "error", title: getAccountErrorMessage(error) });
  },
});
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="false"
    :title="t('features.account.avatar.title')"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
  >
    <template #body>
      <div v-if="open && imageSrc" class="flex flex-col gap-4">
        <div
          class="bg-elevated relative h-72 w-full overflow-hidden rounded-lg"
        >
          <Cropper
            ref="cropperRef"
            :canvas="{ imageSmoothingQuality: 'high' }"
            :resize-image="{ touch: false, wheel: false, adjustStencil: false }"
            :src="imageSrc"
            :stencil-props="{
              aspectRatio: 1,
              handlers: {},
              movable: false,
              resizable: false,
            }"
            :stencil-size="STENCIL_SIZE"
            class="h-full w-full"
            image-restriction="stencil"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-sm">
            <span>{{ t("features.account.avatar.zoom") }}</span>
            <span class="text-muted tabular-nums">{{ zoom.toFixed(1) }}x</span>
          </div>
          <USlider
            :aria-label="t('features.account.avatar.zoom')"
            :max="ZOOM_MAX"
            :min="ZOOM_MIN"
            :model-value="zoom"
            :step="0.1"
            @update:model-value="onZoomChange"
          />
        </div>

        <div class="flex items-center justify-center gap-2">
          <UButton
            :disabled="mutation.isPending.value"
            :label="t('features.account.avatar.rotateLeft')"
            color="neutral"
            icon="i-lucide-rotate-ccw"
            size="sm"
            variant="subtle"
            @click="rotate(-ROTATION_STEP)"
          />
          <UButton
            :disabled="mutation.isPending.value"
            :label="t('features.account.avatar.rotateRight')"
            color="neutral"
            icon="i-lucide-rotate-cw"
            size="sm"
            variant="subtle"
            @click="rotate(ROTATION_STEP)"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :disabled="mutation.isPending.value"
        :label="t('common.cancel')"
        color="neutral"
        variant="subtle"
        @click="open = false"
      />
      <UButton
        :disabled="!imageSrc"
        :label="
          mutation.isPending.value
            ? t('features.account.avatar.uploading')
            : t('features.account.avatar.upload')
        "
        :loading="mutation.isPending.value"
        icon="i-lucide-upload"
        @click="mutation.mutate()"
      />
    </template>
  </UModal>
</template>
