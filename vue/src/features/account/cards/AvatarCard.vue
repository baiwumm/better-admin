<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";

import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useMutation } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import { deleteAccountAvatar, getAccountErrorMessage } from "../account-api";

/** 头像卡（对齐 React 端 avatar-card）：当前头像 + 更换（选择图片 → 裁剪上传）/ 删除 */
defineProps<{
  profile: AccountProfile;
}>();

const emit = defineEmits<{
  /** 删除成功（参数为服务端返回的最新账户详情，页面统一同步缓存与 auth-store 快照） */
  saved: [updated: AccountProfile];
  /** 选中图片（objectURL 的创建/释放与裁剪弹窗由页面统一管理） */
  pickImage: [file: File];
}>();

const { t } = useI18n();
const toast = useToast();
const fileInput = ref<HTMLInputElement | null>(null);

const deleteMutation = useMutation({
  mutationFn: deleteAccountAvatar,
  onSuccess: (updated) => {
    toast.add({
      color: "success",
      title: t("features.account.avatar.deleteSuccess"),
    });
    emit("saved", updated);
  },
  onError: (error) => {
    toast.add({ color: "error", title: getAccountErrorMessage(error) });
  },
});

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  // 允许重复选择同一文件：先清空 value
  input.value = "";
  if (file) emit("pickImage", file);
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-bold">{{ t("features.account.avatar.cardTitle") }}</h3>
    </template>

    <div class="flex items-center gap-4">
      <!-- key 随 avatar 变化强制重建：删除后图片节点卸载，保证首字回退立即回显 -->
      <UAvatar
        :key="profile.avatar ?? 'fallback'"
        :alt="profile.displayName"
        :src="profile.avatar ?? undefined"
        :text="profile.displayName.slice(0, 1)"
        class="shrink-0"
        size="3xl"
      />
      <div class="flex items-center gap-2">
        <!-- 删除进行中禁用更换，避免并发读改头像 -->
        <UButton
          :disabled="deleteMutation.isPending.value"
          :label="t('features.account.avatar.change')"
          color="neutral"
          icon="i-lucide-camera"
          size="sm"
          variant="outline"
          @click="fileInput?.click()"
        />
        <UButton
          v-if="profile.avatar"
          :disabled="deleteMutation.isPending.value"
          :label="t('features.account.avatar.delete')"
          :loading="deleteMutation.isPending.value"
          color="error"
          icon="i-lucide-trash-2"
          size="sm"
          variant="soft"
          @click="deleteMutation.mutate()"
        />
      </div>
    </div>

    <template #footer>
      <p class="text-muted text-xs">
        {{ t("features.account.avatar.cardDescription") }}
      </p>
    </template>

    <!-- 隐藏文件选择入口：本卡触发 change，objectURL 与裁剪弹窗由页面管理 -->
    <input
      ref="fileInput"
      accept="image/webp,image/png,image/jpeg"
      aria-hidden="true"
      class="hidden"
      type="file"
      @change="onFileChange"
    />
  </UCard>
</template>
