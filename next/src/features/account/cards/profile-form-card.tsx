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

interface ProfileFormValues {
  displayName: string;
  phone: string;
  tags: string[];
}

const profileFormSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\- ]{3,19}$/)
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
                <Input
                  maxLength={50}
                  placeholder={t(
                    "features.account.profile.displayNamePlaceholder",
                  )}
                  variant="secondary"
                />
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
                  maxLength={20}
                  placeholder={t("features.account.profile.phonePlaceholder")}
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
