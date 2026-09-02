"use client";

import type { Role } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Spinner,
  Switch,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { Check, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createRole, getRoleErrorMessage, updateRole } from "./role-api";

import {
  SortField,
  sortFieldSchema,
} from "@/components/common/sort-field/sort-field";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { useTranslation } from "@/i18n";

/**
 * 角色新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - code 仅创建时可填且创建后不可变更（角色 code 为程序标识，后端锁定）；
 * - name/code 唯一性由后端 409（ROLE_NAME_EXISTS / ROLE_CODE_EXISTS）拦截；
 * - sort 控制列表排序（服务端按 sort + createdAt 排序）；enabled 开关直接
 *   落在表单内（新增默认启用）。super_admin 编辑态仅 description 可改。
 */

export type RoleFormMode = "create" | "edit";

export interface RoleFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: RoleFormMode;
  /** edit：被编辑的角色；create：null */
  role: Role | null;
  /** 保存成功回调（页面统一做列表失效与提示） */
  onSaved: () => void;
}

const FORM_ID = "role-form";

/** 角色标识：字母开头，允许数字/中划线/下划线（与菜单/字典 code 风格一致） */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const roleFormSchema = z.object({
  code: z.string().trim().min(1).max(50).regex(CODE_PATTERN),
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200),
  sort: sortFieldSchema,
  enabled: z.boolean(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

export function RoleFormDialog({
  isOpen,
  onOpenChange,
  mode,
  role,
  onSaved,
}: RoleFormDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（RoleFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen ? (
    <RoleFormModal
      key={`${mode}:${role?.id ?? "new"}`}
      isOpen
      mode={mode}
      role={role}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface RoleFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: RoleFormMode;
  role: Role | null;
  onSaved: () => void;
}

function RoleFormModal({
  isOpen,
  onOpenChange,
  mode,
  role,
  onSaved,
}: RoleFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";
  // 系统内置角色保护（仅编辑态）：code/name/enabled 均不可改，
  // 唯一可编辑字段为 description（后端授权/删除另有 403 兜底）
  const isSuperAdmin = isEdit && role?.code === SUPER_ADMIN_ROLE_CODE;

  const { control, handleSubmit, watch, setValue } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      code: role?.code ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
      sort: role?.sort ?? 0,
      enabled: role?.enabled ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      const input = {
        name: values.name,
        description: values.description || undefined,
        sort: values.sort,
        enabled: values.enabled,
      };

      return isEdit
        ? updateRole(role!.id, input)
        : createRole({ code: values.code, ...input });
    },
    // 提示反馈统一由 onSubmit 的 toast.promise 呈现（loading → success/error）；
    // 成功副作用（缓存失效联动、关弹窗）保留在此
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    toast.promise(mutation.mutateAsync(values), {
      loading: t("features.roles.form.saving"),
      success: t(
        isEdit
          ? "features.roles.message.updateSuccess"
          : "features.roles.message.createSuccess",
      ),
      error: (error) => getRoleErrorMessage(error),
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
              {t(
                mode === "edit"
                  ? "features.roles.form.title.edit"
                  : "features.roles.form.title.create",
              )}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              className="flex flex-col gap-4"
              id={FORM_ID}
              // 校验统一交给 react-hook-form（aria 行为避免 required 抢聚焦阻断提交）
              validationBehavior="aria"
              onSubmit={(event) => void onSubmit(event)}
            >
              <Controller
                control={control}
                name="code"
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
                    <Label>{t("features.roles.form.code")}</Label>
                    <Input
                      maxLength={50}
                      placeholder="editor"
                      variant="secondary"
                    />
                    {fieldState.error ? (
                      <FieldError>
                        {!field.value?.trim()
                          ? t("features.roles.form.codeRequired")
                          : t("features.roles.form.codeFormat")}
                      </FieldError>
                    ) : (
                      <Description>
                        {t("features.roles.form.codeHint")}
                      </Description>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    isRequired
                    className="flex flex-col gap-1"
                    isDisabled={isSuperAdmin}
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.roles.form.name")}</Label>
                    <Input
                      maxLength={50}
                      placeholder={t("features.roles.form.namePlaceholder")}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.roles.form.nameInvalid")}
                      </FieldError>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field, fieldState }) => (
                  <TextField
                    className="flex flex-col gap-1"
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.roles.form.description")}</Label>
                    <TextArea
                      maxLength={200}
                      placeholder={t(
                        "features.roles.form.descriptionPlaceholder",
                      )}
                      rows={3}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.roles.form.descriptionInvalid")}
                      </FieldError>
                    )}
                  </TextField>
                )}
              />

              <SortField
                value={watch("sort")}
                onChange={(value) =>
                  setValue("sort", value, { shouldValidate: true })
                }
              />

              <Controller
                control={control}
                name="enabled"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
                    <Label>{t("features.roles.form.enabled")}</Label>
                    <Switch
                      aria-label={t("features.roles.form.enabled")}
                      isDisabled={isSuperAdmin}
                      isSelected={field.value}
                      onChange={field.onChange}
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
                    {t("features.roles.form.saving")}
                  </>
                ) : (
                  t("common.confirm")
                )
              }
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
