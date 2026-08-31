import type { AccountProfile } from "@/lib/api-types";
import type { ReactNode } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  ACCOUNT_PROFILE_QUERY_KEY,
  fetchAccountProfile,
  getAccountErrorMessage,
  updateAccountEmail,
  updateAccountPassword,
  updateAccountProfile,
} from "./account-api";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import { TagInput } from "./tag-input";

import { ErrorContent } from "@/components/common/error-content/error-content";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 我的账户页（非菜单路由，max-w 居中布局）：
 * 头像（裁剪上传）→ 基本信息（displayName / phone / tags）→ 邮箱 → 密码 → 账号信息（只读）。
 *
 * - 改邮箱 / 改密码需当前密码确认（后端 bcrypt 校验）；
 * - 改密码成功后端 tokenVersion+1、清空托管 refreshToken：本会话即刻失效，
 *   前端清空本地会话并跳转登录页；
 * - 头像 / 资料保存成功后同步 auth-store 快照（侧边栏头像与名称即时刷新）。
 */

export function AccountPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const cropDialog = useOverlayState();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ACCOUNT_PROFILE_QUERY_KEY,
    queryFn: fetchAccountProfile,
  });

  /** 保存成功后统一同步：auth-store 快照（侧边栏）+ 详情缓存 */
  const applyProfileUpdate = (updated: AccountProfile) => {
    queryClient.setQueryData<AccountProfile>(
      ACCOUNT_PROFILE_QUERY_KEY,
      updated,
    );
    if (authUser) {
      setUser({
        ...authUser,
        displayName: updated.displayName,
        email: updated.email,
        avatar: updated.avatar,
        phone: updated.phone,
        tags: updated.tags,
      });
    }
  };

  /** 选择图片 → 生成 objectURL 打开裁剪弹窗（关闭时统一 revoke） */
  const closeCropDialog = (isOpen: boolean) => {
    cropDialog.setOpen(isOpen);
    if (!isOpen) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <ErrorContent
        action={
          <Button size="sm" variant="secondary" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        }
        description={error instanceof Error ? error.message : undefined}
        title={t("features.account.loadError")}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-6">
      {/* 头像 */}
      <Card>
        <Card.Header>
          <div>
            <Card.Title>{t("features.account.avatar.cardTitle")}</Card.Title>
            <Card.Description>
              {t("features.account.avatar.cardDescription")}
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center gap-4">
            <Avatar
              className="shrink-0"
              color="accent"
              size="lg"
              variant="soft"
            >
              {profile.avatar ? (
                <Avatar.Image alt={profile.displayName} src={profile.avatar} />
              ) : null}
              <Avatar.Fallback>
                {profile.displayName.slice(0, 1)}
              </Avatar.Fallback>
            </Avatar>
            <Button
              variant="outline"
              onPress={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              {t("features.account.avatar.change")}
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* 基本信息（displayName / phone / tags） */}
      <ProfileFormCard
        key={`profile:${profile.updatedAt}`}
        profile={profile}
        onSaved={applyProfileUpdate}
      />

      {/* 修改邮箱 */}
      <EmailFormCard
        key={`email:${profile.updatedAt}`}
        profile={profile}
        onSaved={applyProfileUpdate}
      />

      {/* 修改密码 */}
      <PasswordFormCard />

      {/* 账号信息（只读） */}
      <AccountInfoCard profile={profile} />

      {/* 头像选择与裁剪弹窗 */}
      <input
        ref={fileInputRef}
        aria-hidden
        accept="image/webp,image/png,image/jpeg"
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];

          // 允许重复选择同一文件：先清空 value
          event.target.value = "";
          if (!file) return;
          setImageSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);

            return URL.createObjectURL(file);
          });
          cropDialog.open();
        }}
      />
      <AvatarCropDialog
        imageSrc={imageSrc}
        isOpen={cropDialog.isOpen}
        onOpenChange={closeCropDialog}
        onUploaded={(avatar) => {
          applyProfileUpdate({ ...profile, avatar });
        }}
      />
    </div>
  );
}

/* ----------------------------- 基本信息 ----------------------------- */

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

interface ProfileFormCardProps {
  profile: AccountProfile;
  onSaved: (updated: AccountProfile) => void;
}

/** 基本信息卡：username 只读，displayName / phone / tags 可编辑 */
function ProfileFormCard({ profile, onSaved }: ProfileFormCardProps) {
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
        <div>
          <Card.Title>{t("features.account.profile.title")}</Card.Title>
          <Card.Description>
            {t("features.account.profile.description")}
          </Card.Description>
        </div>
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
        <Button form={FORM_ID} isPending={mutation.isPending} type="submit">
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

/* ----------------------------- 修改邮箱 ----------------------------- */

const EMAIL_FORM_ID = "account-email-form";

interface EmailFormValues {
  email: string;
  currentPassword: string;
}

const emailFormSchema = z.object({
  email: z.string().trim().email(),
  currentPassword: z.string().min(1),
});

interface EmailFormCardProps {
  profile: AccountProfile;
  onSaved: (updated: AccountProfile) => void;
}

/** 邮箱卡：新邮箱 + 当前密码确认（唯一性由后端校验，冲突 409） */
function EmailFormCard({ profile, onSaved }: EmailFormCardProps) {
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
        <div>
          <Card.Title>{t("features.account.email.title")}</Card.Title>
          <Card.Description>
            {t("features.account.email.description")}
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          id={EMAIL_FORM_ID}
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
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.currentPassword")}</Label>
                <Input
                  autoComplete="current-password"
                  placeholder={t("features.account.currentPasswordPlaceholder")}
                  type="password"
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.currentPasswordRequired")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />
        </Form>
      </Card.Content>
      <Card.Footer className="justify-end border-t border-separator pt-4">
        <Button
          form={EMAIL_FORM_ID}
          isPending={mutation.isPending}
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

/* ----------------------------- 修改密码 ----------------------------- */

const PASSWORD_FORM_ID = "account-password-form";

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
function PasswordFormCard() {
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
        <div>
          <Card.Title>{t("features.account.password.title")}</Card.Title>
          <Card.Description>
            {t("features.account.password.description")}
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          id={PASSWORD_FORM_ID}
          validationBehavior="aria"
          onSubmit={(event) => void onSubmit(event)}
        >
          <Controller
            control={control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.currentPassword")}</Label>
                <Input
                  autoComplete="current-password"
                  placeholder={t("features.account.currentPasswordPlaceholder")}
                  type="password"
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.currentPasswordRequired")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.password.newPassword")}</Label>
                <Input
                  autoComplete="new-password"
                  placeholder={t(
                    "features.account.password.newPasswordPlaceholder",
                  )}
                  type="password"
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.password.newPasswordInvalid")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <TextField
                className="flex flex-col gap-1"
                isInvalid={Boolean(fieldState.error)}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                <Label>{t("features.account.password.confirmPassword")}</Label>
                <Input
                  autoComplete="new-password"
                  placeholder={t(
                    "features.account.password.confirmPasswordPlaceholder",
                  )}
                  type="password"
                  variant="secondary"
                />
                {fieldState.error ? (
                  <FieldError>
                    {t("features.account.password.confirmPasswordMismatch")}
                  </FieldError>
                ) : null}
              </TextField>
            )}
          />
        </Form>
      </Card.Content>
      <Card.Footer className="justify-end border-t border-separator pt-4">
        <Button
          form={PASSWORD_FORM_ID}
          isPending={mutation.isPending}
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

/* --------------------------- 账号信息（只读） --------------------------- */

interface AccountInfoCardProps {
  profile: AccountProfile;
}

/** 只读账号信息卡：角色 / 状态 / 注册时间 / 最近登录 */
function AccountInfoCard({ profile }: AccountInfoCardProps) {
  const { t } = useTranslation();

  const infoRows: { label: string; value: ReactNode }[] = [
    {
      label: t("features.account.info.roles"),
      value:
        profile.roles.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1">
            {profile.roles.map((role) => (
              <Chip key={role.id} size="sm">
                {role.name}
              </Chip>
            ))}
          </span>
        ) : (
          <Typography color="muted" type="body-sm">
            {t("features.account.info.noRole")}
          </Typography>
        ),
    },
    {
      label: t("features.account.info.status"),
      value: (
        <Chip
          color={profile.status === "active" ? "success" : "danger"}
          size="sm"
          variant="soft"
        >
          {t(
            profile.status === "active"
              ? "features.account.info.statusActive"
              : "features.account.info.statusDisabled",
          )}
        </Chip>
      ),
    },
    {
      label: t("features.account.info.createdAt"),
      value: (
        <Typography type="body-sm">
          {new Date(profile.createdAt).toLocaleString()}
        </Typography>
      ),
    },
    {
      label: t("features.account.info.lastLoginAt"),
      value: (
        <Typography type="body-sm">
          {profile.lastLoginAt
            ? new Date(profile.lastLoginAt).toLocaleString()
            : t("features.account.info.never")}
        </Typography>
      ),
    },
  ];

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Title>{t("features.account.info.title")}</Card.Title>
          <Card.Description>
            {t("features.account.info.description")}
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {infoRows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <Typography color="muted" type="body-sm">
              {row.label}
            </Typography>
            {row.value}
          </div>
        ))}
      </Card.Content>
    </Card>
  );
}
