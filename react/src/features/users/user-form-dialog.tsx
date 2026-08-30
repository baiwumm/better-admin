import type { Key } from "@heroui/react";
import type { Role, User } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { Check, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useMemo } from "react";
import { z } from "zod";

import {
  ROLE_OPTIONS_QUERY_KEY,
  createUser,
  fetchRoleOptions,
  getUserErrorMessage,
  updateUser,
} from "./user-api";
import { PasswordField } from "./password-field";

import { useTranslation } from "@/i18n";

/**
 * 用户新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - username 仅创建时可填且创建后不可变更（后端契约锁定）；
 * - 编辑态不含密码字段：改密走「重置密码」弹窗（POST /users/:id/reset-password），
 *   编辑接口本身不接收 password；
 * - username/email 唯一性由后端 409（USERNAME_EXISTS / EMAIL_EXISTS）拦截；
 * - roleIds 为全量替换语义：编辑时始终下发完整数组（含空数组 = 清空角色）。
 */

export type UserFormMode = "create" | "edit";

export interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: UserFormMode;
  /** edit：被编辑的用户；create：null */
  user: User | null;
  /** 保存成功回调（页面统一做列表失效与提示） */
  onSaved: () => void;
}

const FORM_ID = "user-form";

/**
 * 编辑态不含密码字段，schema 必须按模式跳过密码校验：
 * 若编辑时仍校验 password（空串不过 min(6)），resolver 会在未渲染字段上
 * 产生错误，handleSubmit 静默失败（表现为「点保存没反应」）。
 */
const buildUserFormSchema = (isEdit: boolean) =>
  z
    .object({
      username: z.string().trim().min(1).max(50),
      displayName: z.string().trim().min(1).max(50),
      email: z.email().max(100),
      password: z.string(),
      confirmPassword: z.string(),
      status: z.enum(["active", "disabled"]),
      // 契约 v1.4.5：用户最多关联 5 个角色（后端 DTO @ArrayMaxSize(5) 同步拦截）
      roleIds: z.array(z.string()).max(5, "rolesMax"),
    })
    .superRefine((values, ctx) => {
      if (isEdit) return;
      if (values.password.length < 6) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "passwordTooShort",
        });
      }
      if (values.password !== values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "confirmPasswordMismatch",
        });
      }
    });

type UserFormValues = z.infer<ReturnType<typeof buildUserFormSchema>>;

export function UserFormDialog({
  isOpen,
  onOpenChange,
  mode,
  user,
  onSaved,
}: UserFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal.Backdrop
      isKeyboardDismissDisabled
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {t(
                mode === "edit"
                  ? "features.users.form.title.edit"
                  : "features.users.form.title.create",
              )}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {isOpen && (
              <UserForm
                key={`${mode}:${user?.id ?? "new"}`}
                mode={mode}
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

interface UserFormProps {
  mode: UserFormMode;
  user: User | null;
  onDone: () => void;
  onSaved: () => void;
}

function UserForm({ mode, user, onDone, onSaved }: UserFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";

  const formSchema = useMemo(() => buildUserFormSchema(isEdit), [isEdit]);
  const { control, handleSubmit } = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username ?? "",
      displayName: user?.displayName ?? "",
      email: user?.email ?? "",
      password: "",
      confirmPassword: "",
      status: user?.status ?? "active",
      // 编辑回显：User.roles 为 {id,name,code} 摘要，映射出 roleIds
      roleIds: user?.roles.map((role) => role.id) ?? [],
    },
  });

  // 角色下拉选项：仅启用角色；pageSize 上限 50，超出由 fetchRoleOptions 续拉
  const { data: roleOptions = [], isLoading: rolesLoading } = useQuery({
    enabled: true,
    queryKey: ROLE_OPTIONS_QUERY_KEY,
    queryFn: fetchRoleOptions,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (isEdit) {
        return updateUser(user!.id, {
          email: values.email,
          displayName: values.displayName,
          status: values.status,
          roleIds: values.roleIds,
        });
      }

      return createUser({
        username: values.username,
        email: values.email,
        displayName: values.displayName,
        password: values.password,
        status: values.status,
        roleIds: values.roleIds,
      });
    },
    onSuccess: () => {
      onSaved();
      toast.success(
        t(
          isEdit
            ? "features.users.message.updateSuccess"
            : "features.users.message.createSuccess",
        ),
      );
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
      // 校验统一交给 react-hook-form（aria 行为避免 required 抢聚焦阻断提交）
      validationBehavior="aria"
      onSubmit={(event) => void onSubmit(event)}
    >
      <Controller
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <TextField
            isRequired
            className="flex flex-col gap-1"
            isDisabled={isEdit}
            isInvalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          >
            <Label>{t("features.users.form.username")}</Label>
            <Input
              maxLength={50}
              placeholder={t("features.users.form.usernamePlaceholder")}
              variant="secondary"
            />
            {fieldState.error ? (
              <FieldError>
                {t("features.users.form.usernameInvalid")}
              </FieldError>
            ) : isEdit ? (
              <Description>{t("features.users.form.usernameHint")}</Description>
            ) : null}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            isRequired
            className="flex flex-col gap-1"
            isInvalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          >
            <Label>{t("features.users.form.displayName")}</Label>
            <Input
              maxLength={50}
              placeholder={t("features.users.form.displayNamePlaceholder")}
              variant="secondary"
            />
            {fieldState.error && (
              <FieldError>
                {t("features.users.form.displayNameInvalid")}
              </FieldError>
            )}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            isRequired
            className="flex flex-col gap-1"
            isInvalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          >
            <Label>{t("features.users.form.email")}</Label>
            <Input
              maxLength={100}
              placeholder={t("features.users.form.emailPlaceholder")}
              variant="secondary"
            />
            {fieldState.error && (
              <FieldError>{t("features.users.form.emailInvalid")}</FieldError>
            )}
          </TextField>
        )}
      />

      {!isEdit && (
        <>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <PasswordField
                autoComplete="new-password"
                description={t("features.users.form.passwordHint")}
                error={
                  fieldState.error
                    ? t("features.users.form.passwordInvalid")
                    : undefined
                }
                label={t("features.users.form.password")}
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
                label={t("features.users.form.confirmPassword")}
                placeholder={t("features.users.form.confirmPassword")}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
        </>
      )}

      <Controller
        control={control}
        name="status"
        render={({ field }) => {
          const isActive = field.value === "active";

          return (
            <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
              <Label>{t("features.users.form.status")}</Label>
              <Switch
                aria-label={t("features.users.form.status")}
                isSelected={isActive}
                onChange={(selected) =>
                  field.onChange(selected ? "active" : "disabled")
                }
              >
                {({ isSelected }) => (
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb>
                        <Switch.Icon>
                          {isSelected ? (
                            <Check className="size-3 text-inherit opacity-100" />
                          ) : (
                            <X className="size-3 text-inherit opacity-70" />
                          )}
                        </Switch.Icon>
                      </Switch.Thumb>
                    </Switch.Control>
                  </Switch.Content>
                )}
              </Switch>
            </div>
          );
        }}
      />

      <Controller
        control={control}
        name="roleIds"
        render={({ field, fieldState }) => {
          const selected = field.value as Key[];

          return (
            <div className="flex flex-col gap-1">
              <Select
                className="w-full"
                isInvalid={Boolean(fieldState.error)}
                placeholder={
                  rolesLoading
                    ? t("features.users.form.rolesLoading")
                    : roleOptions.length === 0
                      ? t("features.users.form.rolesEmpty")
                      : t("features.users.form.rolesPlaceholder")
                }
                selectionMode="multiple"
                value={selected}
                variant="secondary"
                onChange={(keys) =>
                  field.onChange(((keys as Key[]) ?? []).map(String))
                }
              >
                <Label>{t("features.users.form.roles")}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox selectionMode="multiple">
                    {roleOptions.map((role: Role) => (
                      <ListBox.Item
                        key={role.id}
                        id={role.id}
                        textValue={role.name}
                      >
                        {role.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {fieldState.error && (
                <FieldError>{t("features.users.form.rolesMax")}</FieldError>
              )}
            </div>
          );
        }}
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
                {t("features.users.form.saving")}
              </>
            ) : (
              t("common.confirm")
            )
          }
        </Button>
      </Modal.Footer>
    </Form>
  );
}
