import { ref } from "vue";

/**
 * 弹窗组状态管理（feature 级「同类型弹窗互斥」模式，与 React 端 useDialogState
 * 行为一致）：
 * - open：当前打开的弹窗类型（null = 全关）；
 * - currentRow：当前操作的行数据（编辑/删除等按行弹窗使用）。
 * 同一类型再点一次即关闭。
 */
export function useDialogState<TRow, TType extends string = string>() {
  const open = ref<TType | null>(null);
  const currentRow = ref<TRow | null>(null);

  function openDialog(type: TType, row: TRow | null = null) {
    currentRow.value = row;
    open.value = open.value === type ? null : type;
  }

  function closeDialog() {
    open.value = null;
  }

  return { open, currentRow, openDialog, closeDialog };
}
