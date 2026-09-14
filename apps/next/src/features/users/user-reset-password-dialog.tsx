"use client";

import type { User } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Modal, Spinner, toast } from "@heroui/react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getUserErrorMessage, resetUserPassword } from "./user-api";
import { PasswordField } from "./password-field";

import { useTranslation } from "@/i18n";
import { buildPasswordSchema } from "@/lib/password-validation";

/**
 * 重置密码弹窗：POST /users/:id/reset-password（RESET_PASSWORD 位）。
 *
 * 后端行为：bcrypt 重新散列 + tokenVersion+1 + 物理清空该用户全部
 * refreshTokens——成功后该用户所有已登录设备即刻下线，需重新登录。
 * 密码策略（契约 v1.8.0）：格式 + 「不含目标用户名」在前端预检；
 * 「不能与其当前密码相同」由后端 400 PASSWORD_SAME_AS_OLD 兜底。
 */

export interface UserResetPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User | null;
  /** 重置成功回调（页面统一做列表失效） */
  onSaved: () => void;
}

const FORM_ID = "user-reset-password-form";

const buildResetPasswordSchema = (username: string) =>
  z
    .object({
      newPassword: buildPasswordSchema(username),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: "confirmPasswordMismatch",
      path: ["confirmPassword"],
    });

type ResetPasswordValues = z.infer<ReturnType<typeof buildResetPasswordSchema>>;

export function UserResetPasswordDialog({
  isOpen,
  onOpenChange,
  user,
  onSaved,
}: UserResetPasswordDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（ResetPasswordFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen && user ? (
    <ResetPasswordFormModal
      key={user.id}
      isOpen
      user={user}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface ResetPasswordFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User;
  onSaved: () => void;
}

function ResetPasswordFormModal({
  isOpen,
  onOpenChange,
  user,
  onSaved,
}: ResetPasswordFormProps) {
  const { t } = useTranslation();
  // 外层按 user.id 重挂载，用户名在弹窗生命周期内不变，schema 只需构建一次
  const schema = useMemo(
    () => buildResetPasswordSchema(user.username),
    [user.username],
  );

  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetUserPassword(user.id, values.newPassword),
    // 提示反馈统一由 onSubmit 的 toast.promise 呈现（loading → success/error）；
    // 成功副作用（缓存失效联动、关弹窗）保留在此
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    toast.promise(mutation.mutateAsync(values), {
      loading: t("features.users.resetPassword.saving"),
      success: t("features.users.resetPassword.success"),
      error: (error) => getUserErrorMessage(error),
    });
  });

  return (
    <Modal.Backdrop
      isKeyboardDismissDisabled
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {t("features.users.resetPassword.title")}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              className="flex flex-col gap-4"
              id={FORM_ID}
              validationBehavior="aria"
              onSubmit={(event) => void onSubmit(event)}
            >
              <div className="text-sm text-muted">
                {t("features.users.resetPassword.desc", {
                  name: user.displayName || user.username,
                })}
              </div>

              <Controller
                control={control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <PasswordField
                    autoComplete="new-password"
                    description={t("features.users.resetPassword.passwordHint")}
                    error={
                      fieldState.error
                        ? t(
                            `features.users.form.password.${fieldState.error.message}`,
                          )
                        : undefined
                    }
                    label={t("features.users.resetPassword.newPassword")}
                    placeholder={t("features.users.form.passwordPlaceholder")}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <PasswordField
                    autoComplete="new-password"
                    error={
                      fieldState.error
                        ? t("features.users.form.confirmPasswordMismatch")
                        : undefined
                    }
                    label={t("features.users.resetPassword.confirmPassword")}
                    placeholder={t(
                      "features.users.resetPassword.confirmPassword",
                    )}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
            </Form>
          </Modal.Body>

          <Modal.Footer className="w-full">
            <Button slot="close" variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button form={FORM_ID} isPending={mutation.isPending} type="submit">
              {({ isPending }) =>
                isPending ? (
                  <>
                    <Spinner color="current" size="sm" />
                    {t("features.users.resetPassword.saving")}
                  </>
                ) : (
                  t("features.users.resetPassword.submit")
                )
              }
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
