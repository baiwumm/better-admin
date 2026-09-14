<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Role } from "@/lib/api-types";

/** 行操作下拉（cell 组件）：授权/编辑/启停/删除，按权限与内置角色保护显隐。 */
const props = defineProps<{
  role: Role;
  canEdit: boolean;
  canGrantRow: boolean;
  canToggle: boolean;
  canDeleteRow: boolean;
}>();

const emit = defineEmits<{
  action: [key: "grant" | "edit" | "toggle" | "delete"];
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

  if (props.canGrantRow) {
    list.push({
      key: "grant",
      label: t("features.roles.action.grant"),
      icon: "i-lucide-key-round",
      onSelect: () => emit("action", "grant"),
    });
  }
  if (props.canEdit) {
    list.push({
      key: "edit",
      label: t("common.edit"),
      icon: "i-lucide-pencil",
      onSelect: () => emit("action", "edit"),
    });
  }
  if (props.canToggle) {
    list.push({
      key: "toggle",
      label: t(
        props.role.enabled
          ? "features.roles.action.disable"
          : "features.roles.action.enable",
      ),
      icon: props.role.enabled ? "i-lucide-power-off" : "i-lucide-power",
      color: props.role.enabled ? "error" : undefined,
      onSelect: () => emit("action", "toggle"),
    });
  }
  if (props.canDeleteRow) {
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
