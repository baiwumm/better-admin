"use client";

import type { AccountProfile } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getAccountErrorMessage,
  updateAccountEmail,
  type OnAccountProfileSaved,
} from "../account-api";

import { PasswordInput } from "@/components/common/password-input/password-input";
import { useTranslation } from "@/i18n";

export interface EmailFormCardProps {
  profile: AccountProfile;
  onSaved: OnAccountProfileSaved;
}

const FORM_ID = "account-email-form";

interface EmailFormValues {
  email: string;
  currentPassword: string;
}

const emailFormSchema = z.object({
  email: z.string().trim().email(),
  currentPassword: z.string().min(1),
});

/** 邮箱卡：新邮箱 + 当前密码确认（唯一性由后端校验，冲突 409） */
export function EmailFormCard({ profile, onSaved }: EmailFormCardProps) {
  const { t } = useTranslation();

  const { control, handleSubmit, resetField } = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: profile.email, currentPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: EmailFormValues) =>
      updateAccountEmail({
        email: values.email.trim(),
        currentPassword: values.currentPassword,
      }),
    onSuccess: (updated) => {
      toast.success(t("features.account.email.updateSuccess"));
      resetField("currentPassword");
      onSaved(updated);
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
          {t("features.account.email.title")}
        </Card.Title>
        <Card.Description className="text-xs">
          {t("features.account.email.description")}
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
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.email.newEmail")}</Label>
                <Input
                  maxLength={254}
                  placeholder={t("features.account.email.emailPlaceholder")}
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.email.emailInvalid")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />

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
                {t("features.account.email.updating")}
              </>
            ) : (
              t("features.account.email.update")
            )
          }
        </Button>
      </Card.Footer>
    </Card>
  );
}
