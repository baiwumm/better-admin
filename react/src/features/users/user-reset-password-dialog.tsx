import type { User } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Form, Modal, Spinner, toast } from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getUserErrorMessage, resetUserPassword } from "./user-api";
import { PasswordField } from "./password-field";

import { useTranslation } from "@/i18n";

/**
 * 重置密码弹窗：POST /users/:id/reset-password（RESET_PASSWORD 位）。
 *
 * 后端行为：bcrypt 重新散列 + tokenVersion+1 + 物理清空该用户全部
 * refreshTokens——成功后该用户所有已登录设备即刻下线，需重新登录。
 */

export interface UserResetPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User | null;
  /** 重置成功回调（页面统一做列表失效） */
  onSaved: () => void;
}

const FORM_ID = "user-reset-password-form";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "confirmPasswordMismatch",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function UserResetPasswordDialog({
  isOpen,
  onOpenChange,
  user,
  onSaved,
}: UserResetPasswordDialogProps) {
  const { t } = useTranslation();

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
            {isOpen && user && (
              <ResetPasswordForm
                key={user.id}
                user={user}
                onDone={() => onOpenChange(false)}
                onSaved={onSaved}
              />
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface ResetPasswordFormProps {
  user: User;
  onDone: () => void;
  onSaved: () => void;
}

function ResetPasswordForm({ user, onDone, onSaved }: ResetPasswordFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      resetUserPassword(user.id, values.newPassword),
    onSuccess: () => {
      onSaved();
      toast.success(t("features.users.resetPassword.success"));
      onDone();
    },
    onError: (error) => {
      toast.danger(getUserErrorMessage(error));
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
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
            error={
              fieldState.error
                ? t("features.users.form.passwordInvalid")
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
            placeholder={t("features.users.resetPassword.confirmPassword")}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
      />

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
    </Form>
  );
}
