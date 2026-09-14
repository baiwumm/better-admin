<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";
import type { TabsItem } from "@nuxt/ui";

import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";

import { ACCOUNT_PROFILE_QUERY_KEY, fetchAccountProfile } from "./account-api";
import AvatarCropDialog from "./AvatarCropDialog.vue";
import AccountInfoCard from "./cards/AccountInfoCard.vue";
import AvatarCard from "./cards/AvatarCard.vue";
import EmailFormCard from "./cards/EmailFormCard.vue";
import PasswordFormCard from "./cards/PasswordFormCard.vue";
import ProfileFormCard from "./cards/ProfileFormCard.vue";
import ProfileLinksCard from "./cards/ProfileLinksCard.vue";

import ErrorContent from "@/components/common/ErrorContent.vue";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 我的账户页（对齐 React 端 account-page；非菜单路由，max-w 居中布局，Tabs 分区）：
 * - Account：头像（裁剪上传 / 删除）→ 基本信息（displayName / phone / tags）→ 个人链接 → 账号信息（只读）；
 * - Security：修改邮箱 → 修改密码。
 *
 * 改邮箱 / 改密码需当前密码确认（后端 bcrypt 校验）；改密码成功后端
 * tokenVersion+1、清空托管 refreshToken：本会话即刻失效，前端清空本地会话
 * 并跳转登录页。头像 / 资料保存成功后同步 auth-store 快照（侧边栏即时刷新）。
 */
const { t } = useI18n();
const queryClient = useQueryClient();
const auth = useAuthStore();

const {
  data: profile,
  isLoading,
  isError,
  refetch,
} = useQuery({
  queryKey: ACCOUNT_PROFILE_QUERY_KEY,
  queryFn: fetchAccountProfile,
});

const tabItems = computed<TabsItem[]>(() => [
  {
    label: t("features.account.tabs.account"),
    icon: "i-lucide-user",
    slot: "account",
    value: "account",
  },
  {
    label: t("features.account.tabs.security"),
    icon: "i-lucide-shield-check",
    slot: "security",
    value: "security",
  },
]);
const activeTab = ref<string | number>("account");

/** 保存成功后统一同步：详情缓存 + auth-store 快照（侧边栏） */
function applyProfileUpdate(updated: AccountProfile) {
  queryClient.setQueryData<AccountProfile>(ACCOUNT_PROFILE_QUERY_KEY, updated);

  if (auth.user) {
    auth.setUser({
      ...auth.user,
      displayName: updated.displayName,
      email: updated.email,
      avatar: updated.avatar,
      phone: updated.phone,
      tags: updated.tags,
      website: updated.website,
      githubUsername: updated.githubUsername,
      xUsername: updated.xUsername,
    });
  }
}

// ── 头像选择与裁剪弹窗（objectURL 生命周期由本页管理） ──
const cropOpen = ref(false);
const imageSrc = ref<string | null>(null);

function revokeImageSrc() {
  if (imageSrc.value) URL.revokeObjectURL(imageSrc.value);
  imageSrc.value = null;
}

/** 选中图片 → 生成 objectURL 打开裁剪弹窗（关闭时统一 revoke） */
function handlePickImage(file: File) {
  revokeImageSrc();
  imageSrc.value = URL.createObjectURL(file);
  cropOpen.value = true;
}

function onCropOpenChange(isOpen: boolean) {
  cropOpen.value = isOpen;
  if (!isOpen) revokeImageSrc();
}

function onAvatarUploaded(avatar: string) {
  if (profile.value) applyProfileUpdate({ ...profile.value, avatar });
}

onBeforeUnmount(revokeImageSrc);
</script>

<template>
  <!-- 页面加载骨架屏：模拟「Tabs 条 + 头像卡 + 表单卡」的实际布局形状 -->
  <div
    v-if="isLoading"
    aria-hidden="true"
    class="mx-auto flex w-full max-w-2xl flex-col gap-4"
  >
    <div class="grid grid-cols-2 gap-4">
      <USkeleton class="h-9 rounded-full" />
      <USkeleton class="h-9 rounded-full" />
    </div>

    <UCard>
      <template #header>
        <USkeleton class="h-5 w-16" />
      </template>
      <div class="flex items-center gap-4">
        <USkeleton class="size-12 shrink-0 rounded-full" />
        <USkeleton class="h-8 w-24 rounded-md" />
      </div>
      <template #footer>
        <USkeleton class="h-3 w-64" />
      </template>
    </UCard>

    <UCard>
      <template #header>
        <USkeleton class="h-5 w-20" />
      </template>
      <div class="flex flex-col gap-5">
        <div v-for="index in 4" :key="index" class="flex flex-col gap-2">
          <USkeleton class="h-4 w-16" />
          <USkeleton class="h-9 w-full rounded-md" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <USkeleton class="h-8 w-20 rounded-md" />
        </div>
      </template>
    </UCard>
  </div>

  <div v-else-if="isError || !profile" class="mx-auto w-full max-w-2xl">
    <ErrorContent
      :retry-label="t('common.retry')"
      :title="t('features.account.loadError')"
      @retry="refetch()"
    />
  </div>

  <div v-else class="mx-auto w-full max-w-2xl">
    <UTabs
      v-model="activeTab"
      :items="tabItems"
      :ui="{ trigger: 'grow' }"
      :unmount-on-hide="false"
      class="w-full"
    >
      <template #account>
        <div class="flex flex-col gap-4 pt-4">
          <AvatarCard
            :profile="profile"
            @pick-image="handlePickImage"
            @saved="applyProfileUpdate"
          />
          <!-- key 随 updatedAt 重建：保存成功后表单初值同步为服务端最新值 -->
          <ProfileFormCard
            :key="`profile:${profile.updatedAt}`"
            :profile="profile"
            @saved="applyProfileUpdate"
          />
          <ProfileLinksCard
            :key="`links:${profile.updatedAt}`"
            :profile="profile"
            @saved="applyProfileUpdate"
          />
          <AccountInfoCard :profile="profile" />
        </div>
      </template>

      <template #security>
        <div class="flex flex-col gap-4 pt-4">
          <EmailFormCard
            :key="`email:${profile.updatedAt}`"
            :profile="profile"
            @saved="applyProfileUpdate"
          />
          <PasswordFormCard />
        </div>
      </template>
    </UTabs>

    <AvatarCropDialog
      :image-src="imageSrc"
      :open="cropOpen"
      @update:open="onCropOpenChange"
      @uploaded="onAvatarUploaded"
    />
  </div>
</template>
