"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Form, Spinner, toast } from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getAccountErrorMessage, updateAccountPassword } from "../account-api";
import { PasswordStrength } from "../password-strength";

import { PasswordInput } from "@/components/common/password-input/password-input";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";

const FORM_ID = "account-password-form";

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "confirmPasswordMismatch",
    path: ["confirmPassword"],
  });

/** 密码卡：成功后端全端强制下线（tokenVersion+1），前端清会话跳登录页 */
export function PasswordFormCard() {
  const { t } = useTranslation();
  const clearSession = useAuthStore((state) => state.clearSession);

  const { control, handleSubmit } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      updateAccountPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      // 本会话已被服务端撤销（tokenVersion+1）：清本地会话 → 登录页
      toast.success(t("features.account.password.updateSuccess"));
      clearSession();
      window.location.assign("/sign-in");
    },
    onError: (mutationError) => {
      toast.danger(getAccountErrorMessage(mutationError));
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">
          {t("features.account.password.title")}
        </Card.Title>
        <Card.Description className="text-xs">
          {t("features.account.password.description")}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          id={FORM_ID}
          validationBehavior="aria"
          onSubmit={(event) => void onSubmit(event)}
        >
          <Controller
            control={control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <PasswordInput
                  autoComplete="current-password"
                  label={t("features.account.currentPassword")}
                  placeholder={t("features.account.currentPasswordPlaceholder")}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
                {fieldState.error ? (
                  <p className="text-xs text-danger">
                    {t("features.account.currentPasswordRequired")}
                  </p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <PasswordInput
                  autoComplete="new-password"
                  label={t("features.account.password.newPassword")}
                  placeholder={t(
                    "features.account.password.newPasswordPlaceholder",
                  )}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
                {/* 5 档强度指示（未输入不渲染，见 PasswordStrength） */}
                <PasswordStrength password={field.value ?? ""} />
                {fieldState.error ? (
                  <p className="text-xs text-danger">
                    {t("features.account.password.newPasswordInvalid")}
                  </p>
                ) : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <PasswordInput
                  autoComplete="new-password"
                  label={t("features.account.password.confirmPassword")}
                  placeholder={t(
                    "features.account.password.confirmPasswordPlaceholder",
                  )}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
                {fieldState.error ? (
                  <p className="text-xs text-danger">
                    {t("features.account.password.confirmPasswordMismatch")}
                  </p>
                ) : null}
              </div>
            )}
          />
        </Form>
      </Card.Content>
      <Card.Footer className="justify-end border-t border-separator pt-4">
        <Button
          form={FORM_ID}
          isPending={mutation.isPending}
          size="sm"
          type="submit"
        >
          {({ isPending }) =>
            isPending ? (
              <>
                <Spinner color="current" size="sm" />
                {t("features.account.password.updating")}
              </>
            ) : (
              t("features.account.password.update")
            )
          }
        </Button>
      </Card.Footer>
    </Card>
  );
}
