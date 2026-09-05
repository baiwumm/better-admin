<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { User, UserStatus } from "@/lib/api-types";

/** 行操作下拉（cell 组件）：编辑/重置密码/启停/删除，按权限与保护口径显隐。 */
const props = defineProps<{
  user: User;
  canEdit: boolean;
  canDelete: boolean;
  canResetPassword: boolean;
  /** 目标用户是否受写操作保护（删除/重置密码隐藏；停用按状态判定） */
  isProtected: boolean;
  nextStatus: UserStatus;
  canToggle: boolean;
}>();

const emit = defineEmits<{
  action: [key: "edit" | "reset-password" | "toggle" | "delete"];
}>();

const { t } = useI18n();

const items = computed(() => {
  const list: Array<{
    key: string;
    label: string;
    icon: string;
    color?: "error";
    onSelect: () => void;
  }> = [];

  if (props.canEdit) {
    list.push({
      key: "edit",
      label: t("common.edit"),
      icon: "i-lucide-pencil",
      onSelect: () => emit("action", "edit"),
    });
  }
  if (props.canResetPassword && !props.isProtected) {
    list.push({
      key: "reset-password",
      label: t("features.users.action.resetPassword"),
      icon: "i-lucide-key-round",
      onSelect: () => emit("action", "reset-password"),
    });
  }
  if (props.canToggle) {
    list.push({
      key: "toggle",
      label: t(
        props.user.status === "active"
          ? "features.users.action.disable"
          : "features.users.action.enable",
      ),
      icon:
        props.user.status === "active"
          ? "i-lucide-power-off"
          : "i-lucide-power",
      color: props.user.status === "active" ? "error" : undefined,
      onSelect: () => emit("action", "toggle"),
    });
  }
  if (props.canDelete && !props.isProtected) {
    list.push({
      key: "delete",
      label: t("common.delete"),
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("action", "delete"),
    });
  }

  return [list];
});
</script>

<template>
  <UDropdownMenu
    v-if="items[0]?.length"
    :items="items"
    :content="{ align: 'center' }"
  >
    <UButton
      :aria-label="t('common.actions')"
      color="neutral"
      icon="i-lucide-ellipsis"
      size="sm"
      variant="ghost"
    />
  </UDropdownMenu>
</template>
