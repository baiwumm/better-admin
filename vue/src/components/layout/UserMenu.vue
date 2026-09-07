<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useToast } from "@nuxt/ui/composables";
import type { DropdownMenuItem } from "@nuxt/ui";

import { useAuthStore } from "@/stores/auth-store";

/** 侧边栏用户菜单（对齐 React 端 NavUser：头像 + 名称 + 邮箱 + 菜单）。 */
defineProps<{
  collapsed?: boolean;
}>();

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();
const { t } = useI18n();

async function onLogout() {
  await auth.logout();

  toast.add({
    color: "neutral",
    title: t("layout.user.signedOut"),
  });

  router.push("/sign-in");
}

const items = computed<DropdownMenuItem[][]>(() => [
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
        void onLogout();
      },
    },
  ],
]);

const displayName = computed(() => auth.user?.displayName ?? "");
const email = computed(() => auth.user?.email ?? "");
const initials = computed(() => displayName.value.slice(0, 1).toUpperCase());
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <UDropdownMenu
      :items="items"
      :content="{ align: 'start', side: 'top' }"
      class="min-w-0 flex-1"
    >
      <UButton
        :avatar="{
          alt: displayName,
          src: auth.user?.avatar ?? undefined,
          text: initials,
        }"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
        class="w-full min-w-0"
        color="neutral"
        variant="ghost"
      >
        <!-- 展开态：名称 + 邮箱上下两行（对齐 React 端 SidebarUser） -->
        <template v-if="!collapsed" #default>
          <span class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span class="w-full truncate text-sm font-medium">
              {{ displayName }}
            </span>
            <span class="text-muted w-full truncate text-xs">
              {{ email }}
            </span>
          </span>
        </template>
      </UButton>
    </UDropdownMenu>
  </div>
</template>
