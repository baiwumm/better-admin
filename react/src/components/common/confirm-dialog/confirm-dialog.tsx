import type { ReactNode } from "react";

import {
  AlertDialog,
  Button,
  Description,
  Input,
  Spinner,
  TextField,
} from "@heroui/react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n";

/** useOverlayState 返回值的子集（解耦：仅要求开合能力） */
export interface ConfirmDialogState {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  close: () => void;
}

export interface ConfirmDialogProps {
  /** useOverlayState 创建的开合状态（挂 Backdrop，遵循 §7.2 规范） */
  state: ConfirmDialogState;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作样式（红色按钮 + danger 图标） */
  destructive?: boolean;
  /** 外部 pending 状态（如父组件自身发起请求） */
  isLoading?: boolean;
  /**
   * 强确认：设置后需在输入框中输入该关键字（如实体的 name）才能点击确认，
   * 用于删除角色等高危操作。
   */
  confirmKeyword?: string;
  keywordLabel?: string;
  /** 确认回调；抛错时不关闭弹窗（错误提示由消费方负责） */
  onConfirm: () => void | Promise<void>;
}

/**
 * 通用确认弹窗（HeroUI AlertDialog 封装）：
 * - 简单确认：仅标题/描述 + 确认/取消；
 * - 危险确认：destructive 红色样式；
 * - 强确认：confirmKeyword 输入匹配后才能确认。
 * 确认回调 await 成功后自动关闭，失败保持打开。
 */
export function ConfirmDialog({
  state,
  title,
  description,
  confirmText,
  cancelText,
  destructive = false,
  isLoading = false,
  confirmKeyword,
  keywordLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  // 打开时重置强确认输入
  useEffect(() => {
    if (state.isOpen) setKeywordInput("");
  }, [state.isOpen]);

  const keywordMatched = !confirmKeyword || keywordInput === confirmKeyword;
  const busy = isPending || isLoading;

  const handleConfirm = async () => {
    if (!keywordMatched || busy) return;
    setIsPending(true);
    try {
      await onConfirm();
      state.close();
    } catch {
      // 失败不关闭（消费方 toast 错误），保持当前弹窗上下文
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <AlertDialog.Container placement="center">
        <AlertDialog.Dialog className="sm:max-w-100">
          <AlertDialog.Header>
            {destructive && <AlertDialog.Icon status="danger" />}
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            {description && <div className="text-sm">{description}</div>}
            {confirmKeyword && (
              <TextField
                aria-label={keywordLabel ?? confirmKeyword}
                className="mt-3 w-full"
                value={keywordInput}
                onChange={setKeywordInput}
              >
                <Input
                  autoComplete="off"
                  placeholder={confirmKeyword}
                  variant="secondary"
                />
                <Description>
                  {keywordLabel ??
                    t("common.confirmDialog.keywordHint", {
                      keyword: confirmKeyword,
                    })}
                </Description>
              </TextField>
            )}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button isDisabled={busy} variant="tertiary" onPress={state.close}>
              {cancelText ?? t("common.cancel")}
            </Button>
            <Button
              isDisabled={!keywordMatched}
              isPending={busy}
              variant={destructive ? "danger" : "secondary"}
              onPress={() => void handleConfirm()}
            >
              {({ isPending }) =>
                isPending ? (
                  <>
                    <Spinner color="current" size="sm" />
                    {confirmText ?? t("common.confirm")}
                  </>
                ) : (
                  (confirmText ?? t("common.confirm"))
                )
              }
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
