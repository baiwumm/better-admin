<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";

import type { AppTable } from "./table-types";
import { computed, useSlots } from "vue";
import { useI18n } from "vue-i18n";
import { useEventListener } from "@vueuse/core";

/**
 * 底部浮动批量操作条（布局对齐 React 端 data-table-bulk-actions 胶囊形）：
 * 左侧 Badge 选中计数 + 中间操作插槽（分割线）+ 右侧清空按钮。
 * 进出场用 Vue 内置 Transition：底部淡入上滑 / 退场下滑淡出
 * （尊重 prefers-reduced-motion）；Esc 键清空选择。
 */
const props = defineProps<{
  table: AppTable<TData>;
}>();

const { t } = useI18n();
const slots = useSlots();

const selectedCount = computed(
  () => props.table.getSelectedRowModel().rows.length,
);
const hasActions = computed(() => !!slots.default);

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && selectedCount.value > 0) {
    props.table.resetRowSelection();
  }
}

useEventListener(window, "keydown", onKeydown);
</script>

<template>
  <Transition name="bulk-actions">
    <div
      v-if="selectedCount > 0"
      class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
    >
      <div
        aria-live="polite"
        class="bg-default pointer-events-auto flex items-center gap-1 rounded-full py-1.5 ps-3 pe-1.5 ring ring-accented shadow-lg"
      >
        <span class="sr-only">
          {{ t("common.datatable.selected", { count: selectedCount }) }}
        </span>
        <UBadge color="neutral" variant="soft" class="mx-1 shrink-0">
          {{ selectedCount }}
        </UBadge>
        <template v-if="hasActions">
          <USeparator class="h-5 self-center" orientation="vertical" />
          <div class="flex items-center gap-1">
            <slot />
          </div>
        </template>
        <USeparator class="h-5 self-center" orientation="vertical" />
        <UButton
          :aria-label="t('common.datatable.clearSelection')"
          color="neutral"
          icon="i-lucide-x"
          size="sm"
          variant="ghost"
          @click="table.resetRowSelection()"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.bulk-actions-enter-active,
.bulk-actions-leave-active {
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out;
}

.bulk-actions-enter-from,
.bulk-actions-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .bulk-actions-enter-active,
  .bulk-actions-leave-active {
    transition: none;
  }
}
</style>
