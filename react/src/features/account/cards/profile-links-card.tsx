import type { AccountProfile } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  FieldError,
  Form,
  InputGroup,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { ExternalLink } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getAccountErrorMessage,
  updateAccountProfile,
  type OnAccountProfileSaved,
} from "../account-api";

import { useTranslation } from "@/i18n";

export interface ProfileLinksCardProps {
  profile: AccountProfile;
  onSaved: OnAccountProfileSaved;
}

const FORM_ID = "account-links-form";

/** 与后端同规约：先剥协议/平台前缀再校验，空串归一为 null（清空） */
const WEBSITE_PATTERN =
  /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}(?::\d{1,5})?(?:\/\S*)?$/;
const GITHUB_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const X_PATTERN = /^[a-zA-Z0-9_]{4,15}$/;

const stripWebsite = (v: string) => v.replace(/^https?:\/\//i, "");
const stripGithub = (v: string) =>
  v.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
const stripX = (v: string) =>
  v.replace(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i, "");

const linksFormSchema = z.object({
  website: z
    .string()
    .trim()
    .transform(stripWebsite)
    .refine((v) => v === "" || WEBSITE_PATTERN.test(v), "websiteInvalid")
    .transform((v) => (v === "" ? null : v)),
  githubUsername: z
    .string()
    .trim()
    .transform(stripGithub)
    .refine((v) => v === "" || GITHUB_PATTERN.test(v), "githubInvalid")
    .transform((v) => (v === "" ? null : v)),
  xUsername: z
    .string()
    .trim()
    .transform(stripX)
    .refine((v) => v === "" || X_PATTERN.test(v), "xInvalid")
    .transform((v) => (v === "" ? null : v)),
});

type LinksFormValues = z.input<typeof linksFormSchema>;
type LinksFormOutput = z.output<typeof linksFormSchema>;

/** 个人链接卡：固定协议/平台前缀的输入框，存裸值（域名 / 用户名），展示 URL 由前端拼接 */
export function ProfileLinksCard({ profile, onSaved }: ProfileLinksCardProps) {
  const { t } = useTranslation();

  const { control, handleSubmit } = useForm<
    LinksFormValues,
    unknown,
    LinksFormOutput
  >({
    resolver: zodResolver(linksFormSchema),
    defaultValues: {
      website: profile.website ?? "",
      githubUsername: profile.githubUsername ?? "",
      xUsername: profile.xUsername ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LinksFormOutput) => updateAccountProfile(values),
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

  const linkFields = [
    {
      name: "website" as const,
      label: t("features.account.links.website"),
      prefix: "https://",
      placeholder: "baidu.com",
      errorKey: "websiteInvalid",
      maxLength: 255,
      strip: stripWebsite,
    },
    {
      name: "githubUsername" as const,
      label: t("features.account.links.github"),
      prefix: "https://github.com/",
      placeholder: "baiwumm",
      errorKey: "githubInvalid",
      maxLength: 60,
      strip: stripGithub,
    },
    {
      name: "xUsername" as const,
      label: t("features.account.links.x"),
      prefix: "https://x.com/",
      placeholder: "baiwumm",
      errorKey: "xInvalid",
      maxLength: 40,
      strip: stripX,
    },
  ];

  /** 按提交同款规则剥前缀后拼出预览 URL（输入为空返回 null） */
  const buildPreviewUrl = (
    prefix: string,
    strip: (v: string) => string,
    raw: string,
  ) => {
    const bare = strip(raw.trim());

    return bare === "" ? null : `${prefix}${bare}`;
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">
          {t("features.account.links.title")}
        </Card.Title>
        <Card.Description className="text-xs">
          {t("features.account.links.description")}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          id={FORM_ID}
          validationBehavior="aria"
          onSubmit={(event) => void onSubmit(event)}
        >
          {linkFields.map((field) => (
            <Controller
              key={field.name}
              control={control}
              name={field.name}
              render={({ field: controllerField, fieldState }) => (
                <TextField
                  className="flex flex-col gap-1"
                  isInvalid={Boolean(fieldState.error)}
                  value={controllerField.value ?? ""}
                  onBlur={controllerField.onBlur}
                  onChange={controllerField.onChange}
                >
                  <Label>{field.label}</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Prefix className="text-muted">
                      {field.prefix}
                    </InputGroup.Prefix>
                    <InputGroup.Input
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                    />
                    <InputGroup.Suffix className="pe-0">
                      <Button
                        isIconOnly
                        aria-label={t("features.account.links.open")}
                        isDisabled={
                          buildPreviewUrl(
                            field.prefix,
                            field.strip,
                            controllerField.value ?? "",
                          ) === null
                        }
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          const url = buildPreviewUrl(
                            field.prefix,
                            field.strip,
                            controllerField.value ?? "",
                          );

                          if (url) {
                            window.open(url, "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </InputGroup.Suffix>
                  </InputGroup>
                  {fieldState.error ? (
                    <FieldError>
                      {t(`features.account.links.${field.errorKey}`)}
                    </FieldError>
                  ) : null}
                </TextField>
              )}
            />
          ))}
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
