<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useToast } from "@nuxt/ui/composables";
import type { DropdownMenuItem } from "@nuxt/ui";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import { useAuthStore } from "@/stores/auth-store";

/** 侧边栏用户菜单（对齐 React 端 NavUser：头像 + 名称 + 邮箱 + 菜单）。 */
defineProps<{
  collapsed?: boolean;
}>();

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

// 退出二次确认（对齐 React / Next 端 sidebar-user）：本地会话由 store
// 无条件清理（离线/服务端撤销失败也按已退出处理，产品语义「离线退出
// 始终成功」），统一提示已退出并跳登录页
const exitDialogOpen = ref(false);
const isLoggingOut = ref(false);

async function onLogout() {
  isLoggingOut.value = true;
  try {
    await auth.logout();
  } catch (error) {
    // store 不向调用方抛业务/网络错误；此分支仅兜 UI 层意外异常，
    // 不回滚登录态（会话清理已由 store 完成）
    console.error("[auth] logout 意外异常", error);
  } finally {
    isLoggingOut.value = false;
  }

  toast.add({
    color: "neutral",
    title: t("layout.user.signedOut"),
  });

  exitDialogOpen.value = false;
  router.push("/sign-in");
}

const displayName = computed(() => auth.user?.displayName ?? "");
const email = computed(() => auth.user?.email ?? "");
const initials = computed(() => displayName.value.slice(0, 1).toUpperCase());

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: displayName.value,
      avatar: {
        src: auth.user?.avatar ?? undefined,
        alt: displayName.value,
        loading: "lazy",
      },
    },
  ],
  [
    {
      label: t("layout.user.myAccount"),
      icon: "i-lucide-user",
      onSelect: () => {
        router.push("/account");
      },
    },
    {
      label: t("layout.user.myNotices"),
      icon: "i-lucide-mail-open",
      onSelect: () => {
        router.push("/my-notices");
      },
    },
  ],
  [
    {
      label: t("layout.user.signOut"),
      color: "error",
      icon: "i-lucide-log-out",
      onSelect: () => {
        exitDialogOpen.value = true;
      },
    },
  ],
]);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <UDropdownMenu
      :items="items"
      :content="{ align: 'start', side: 'top' }"
      :ui="{
        content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
      }"
      arrow
      class="min-w-0 flex-1"
    >
      <UButton
        color="neutral"
        variant="ghost"
        block
        class="data-[state=open]:bg-elevated"
        :ui="{
          trailingIcon: 'text-dimmed',
        }"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      >
        <UUser
          :name="collapsed ? undefined : displayName"
          :description="collapsed || displayName === email ? undefined : email"
          :avatar="{
            src: auth.user?.avatar ?? undefined,
            alt: displayName,
            loading: 'lazy',
            text: initials,
          }"
          :chip="{
            color: 'success',
            position: 'bottom-right',
          }"
          :ui="{ wrapper: 'text-left' }"
          size="sm"
        />
      </UButton>
    </UDropdownMenu>

    <!-- 退出二次确认（对齐 React 端 sidebar-user 的 AlertDialog） -->
    <ConfirmDialog
      v-model:open="exitDialogOpen"
      :title="t('layout.user.signOutTitle')"
      :description="t('layout.user.signOutDesc')"
      :confirm-text="t('layout.user.confirmSignOut')"
      destructive
      :loading="isLoggingOut"
      @confirm="onLogout"
    />
  </div>
</template>
