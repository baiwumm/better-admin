"use client";

import type { AccountProfile } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getAccountErrorMessage,
  updateAccountProfile,
  type OnAccountProfileSaved,
} from "../account-api";
import { TagInput } from "../tag-input";

import { useTranslation } from "@/i18n";

export interface ProfileFormCardProps {
  profile: AccountProfile;
  onSaved: OnAccountProfileSaved;
}

const FORM_ID = "account-profile-form";

// 长度上限与后端 DTO 对齐（契约 v1.8.1）；手机号收窄为 11 位大陆手机号标准格式
const DISPLAY_NAME_MAX_LENGTH = 50;
const PHONE_MAX_LENGTH = 11;

interface ProfileFormValues {
  displayName: string;
  phone: string;
  tags: string[];
}

const profileFormSchema = z.object({
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  // 选填：为空合法；填写时必须是 11 位大陆手机号（1 开头，第二位 3-9）
  phone: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/)
    .or(z.literal("")),
  tags: z.array(z.string()),
});

/** 基本信息卡：username 只读，displayName / phone / tags 可编辑 */
export function ProfileFormCard({ profile, onSaved }: ProfileFormCardProps) {
  const { t } = useTranslation();

  const { control, handleSubmit } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.displayName,
      phone: profile.phone ?? "",
      tags: profile.tags,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateAccountProfile({
        displayName: values.displayName.trim(),
        phone: values.phone.trim() ? values.phone.trim() : null,
        tags: values.tags,
      }),
    onSuccess: (updated) => {
      toast.success(t("features.account.profile.saveSuccess"));
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
          {t("features.account.profile.title")}
        </Card.Title>
        <Card.Description className="text-xs">
          {t("features.account.profile.description")}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          id={FORM_ID}
          validationBehavior="aria"
          onSubmit={(event) => void onSubmit(event)}
        >
          <TextField
            isDisabled
            className="flex flex-col gap-1"
            value={profile.username}
          >
            <Label>{t("features.account.profile.username")}</Label>
            <Input variant="secondary" />
            <Description>
              {t("features.account.profile.usernameHint")}
            </Description>
          </TextField>

          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.profile.displayName")}</Label>
                {/* Suffix 实时字数（与用户表单姓名一致，上限与后端 @MaxLength(50) 对齐） */}
                <InputGroup variant="secondary">
                  <InputGroup.Input
                    maxLength={DISPLAY_NAME_MAX_LENGTH}
                    placeholder={t(
                      "features.account.profile.displayNamePlaceholder",
                    )}
                  />
                  <InputGroup.Suffix className="text-xs text-muted">
                    {field.value?.length ?? 0}/{DISPLAY_NAME_MAX_LENGTH}
                  </InputGroup.Suffix>
                </InputGroup>
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.profile.displayNameInvalid")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.profile.phone")}</Label>
                <Input
                  inputMode="tel"
                  maxLength={PHONE_MAX_LENGTH}
                  placeholder={t("features.account.profile.phonePlaceholder")}
                  type="tel"
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.profile.phoneInvalid")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput
                isDisabled={mutation.isPending}
                label={t("features.account.tags.label")}
                placeholder={t("features.account.tags.placeholder")}
                value={field.value ?? []}
                onChange={field.onChange}
              />
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
                {t("features.account.profile.saving")}
              </>
            ) : (
              t("features.account.profile.save")
            )
          }
        </Button>
      </Card.Footer>
    </Card>
  );
}
