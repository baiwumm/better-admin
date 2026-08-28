import { useCallback, useState } from "react";

/**
 * 弹窗组状态管理（feature 级「同类型弹窗互斥」模式）：
 * - open：当前打开的弹窗类型（null = 全关）；
 * - currentRow：当前操作的行数据（编辑/删除等按行弹窗使用）。
 * 同一类型再点一次即关闭（与 react-shadcn 的 useDialogState 行为一致）。
 */
export function useDialogState<TRow, TType extends string = string>() {
  const [open, setOpen] = useState<TType | null>(null);
  const [currentRow, setCurrentRow] = useState<TRow | null>(null);

  const openDialog = useCallback((type: TType, row: TRow | null = null) => {
    setCurrentRow(row);
    setOpen((prev) => (prev === type ? null : type));
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(null);
  }, []);

  return { open, currentRow, openDialog, closeDialog };
}
