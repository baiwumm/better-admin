import type { MenuNode } from "@/lib/api-types";
import type { IconName } from "lucide-react/dynamic";
import type { MenuSaveInput } from "./menu-api";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { DynamicIcon } from "lucide-react/dynamic";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { addChildMenu, createMenu, updateMenu } from "./menu-api";
import {
  collectSelfAndDescendantIds,
  flattenParentOptions,
} from "./menu-tree-utils";

import {
  SortField,
  sortFieldSchema,
} from "@/components/common/sort-field/sort-field";
import { usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";

/**
 * 菜单新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - to 可选：非空时必须以 / 或 https:// 开头且全局唯一（唯一性由后端校验，
 *   冲突返回 MENU_TO_EXISTS）；留空视为目录分组（侧边栏点击仅展开）；
 * - 父级候选排除自身及后代（防成环），编辑态允许变更父级，不选默认顶级；
 * - 按钮权限位：下拉多选（图标 + 中文名，复用权限页 i18n 映射），存 OR 位掩码；
 * - 外链打开方式不落库：to 以 https:// 开头时由导航层新窗口打开（契约 v1.4 已移除 target）；
 * - 父级下拉按树形层级缩进（flattenParentOptions 的 depth）；
 * - 图标输入末尾实时预览（裸 lucide 名，为空不渲染预览）。
 */

export type MenuFormMode = "create" | "addChild" | "edit";

export interface MenuFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: MenuFormMode;
  /** edit：被编辑节点；addChild：父节点；create：null */
  node: MenuNode | null;
  /** 全量树（父级候选来源） */
  tree: MenuNode[];
  /** 保存成功回调（页面统一做缓存失效，避免重复请求） */
  onSaved: () => void;
}

const EMPTY_ICON = "circle";
const FORM_ID = "menu-form";

/** i18n 键：点分格式（如 menu.pageTitle.menus） */
const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

const menuFormSchema = z.object({
  parentId: z.string(),
  label: z.string().trim().min(1).max(50),
  // 可选：与契约对齐（MenuSaveInput.i18nKey 可空）；非空时必须为合法点分格式
  i18nKey: z
    .string()
    .trim()
    .refine((value) => value === "" || I18N_KEY_PATTERN.test(value), {
      message: "i18nKey 格式不合法",
    }),
  icon: z.string().trim().min(1),
  to: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || value.startsWith("https://"),
    ),
  sort: sortFieldSchema,
  keepAlive: z.boolean(),
  hideInMenu: z.boolean(),
  enabled: z.boolean(),
  defaultOpen: z.boolean(),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

/**
 * 表单初始值：
 * - edit：回显被编辑节点；
 * - addChild：仅锁定父级为入参节点，其余字段全部留空（不回显父级数据）；
 * - create：全空。
 */
function buildDefaultValues(
  mode: MenuFormMode,
  node: MenuNode | null,
): MenuFormValues {
  const addChild = mode === "addChild";

  return {
    parentId: addChild ? (node?.id ?? "") : (node?.parentId ?? ""),
    label: addChild ? "" : (node?.label ?? ""),
    i18nKey: addChild ? "" : (node?.i18nKey ?? ""),
    icon: addChild ? "" : (node?.icon ?? ""),
    to: addChild ? "" : (node?.to ?? ""),
    sort: addChild ? 0 : (node?.sort ?? 0),
    keepAlive: addChild ? false : (node?.keepAlive ?? false),
    hideInMenu: addChild ? false : (node?.hideInMenu ?? false),
    enabled: addChild ? true : (node?.enabled ?? true),
    defaultOpen: addChild ? false : (node?.defaultOpen ?? false),
  };
}

export function MenuFormDialog({
  isOpen,
  onOpenChange,
  mode,
  node,
  tree,
  onSaved,
}: MenuFormDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（MenuFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen ? (
    <MenuFormModal
      key={`${mode}:${node?.id ?? "root"}`}
      isOpen
      mode={mode}
      node={node}
      tree={tree}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface MenuFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: MenuFormMode;
  node: MenuNode | null;
  tree: MenuNode[];
  onSaved: () => void;
}

function MenuFormModal({
  isOpen,
  onOpenChange,
  mode,
  node,
  tree,
  onSaved,
}: MenuFormProps) {
  const { t } = useTranslation();

  const titleKey =
    mode === "edit"
      ? "features.menus.form.title.edit"
      : mode === "addChild"
        ? "features.menus.form.title.addChild"
        : "features.menus.form.title.create";

  const { data: permissionItems } = usePermissions();

  const isEdit = mode === "edit";

  // 按钮权限位（bigint OR），初始取被编辑节点已授权位
  const [permBits, setPermBits] = useState<bigint>(() => {
    try {
      return BigInt(node?.permissions ?? "0");
    } catch {
      return 0n;
    }
  });

  // 编辑态的父级候选：排除自身及后代（防成环）
  const excludedIds = useMemo(
    () =>
      isEdit && node ? collectSelfAndDescendantIds(node) : new Set<string>(),
    [isEdit, node],
  );
  const parentOptions = useMemo(
    () =>
      flattenParentOptions(tree).filter(
        (option) => !excludedIds.has(option.id),
      ),
    [tree, excludedIds],
  );
  // 父级选项需要图标渲染，按 id 建索引
  const nodeById = useMemo(() => {
    const map = new Map<string, MenuNode>();

    const walk = (list: MenuNode[]) => {
      for (const item of list) {
        map.set(item.id, item);
        if (item.children?.length) walk(item.children);
      }
    };

    walk(tree);

    return map;
  }, [tree]);

  const { control, handleSubmit, watch, setValue } = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: buildDefaultValues(mode, node),
  });

  const values = watch();

  // 权限位多选：由 permBits 推导选中项；展示名复用权限页 i18n 映射
  const selectedPermissionNames = (permissionItems ?? [])
    .filter((item) => {
      const bits = BigInt(item.bits);

      return bits !== 0n && (permBits & bits) === bits;
    })
    .map((item) => {
      const key = `features.permissions.items.${item.value}`;
      const name = t(key);

      return name === key ? item.label : name;
    });

  const mutation = useMutation({
    mutationFn: (payload: MenuSaveInput) => {
      if (isEdit && node) return updateMenu(node.id, payload);
      if (mode === "addChild" && node) return addChildMenu(node.id, payload);

      return createMenu(payload);
    },
    // 提示反馈统一由 onSubmit 的 toast.promise 呈现（loading → success/error）；
    // 成功副作用（缓存失效联动、关弹窗）保留在此
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    toast.promise(
      mutation.mutateAsync({
        label: values.label,
        i18nKey: values.i18nKey || null,
        icon: values.icon || EMPTY_ICON,
        to: values.to || null,
        parentId: values.parentId || null,
        sort: values.sort,
        keepAlive: values.keepAlive,
        hideInMenu: values.hideInMenu,
        enabled: values.enabled,
        defaultOpen: values.defaultOpen,
        permissions: permBits.toString(),
      }),
      {
        loading: t("features.menus.form.saving"),
        success: t(
          isEdit
            ? "features.menus.message.updateSuccess"
            : "features.menus.message.createSuccess",
        ),
        // 后端错误 message 已本地化（MENU_HAS_CHILDREN / MENU_TO_EXISTS 等）
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      },
    );
  });

  return (
    <Modal.Backdrop
      isKeyboardDismissDisabled
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t(titleKey)}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              className="flex flex-col gap-4"
              id={FORM_ID}
              // aria：禁用 react-aria 原生约束校验（否则 required 输入框会抢先聚焦并
              // 阻断提交，RHF/zod 的 FieldError 无法呈现），校验统一交给 react-hook-form
              validationBehavior="aria"
              onSubmit={(event) => void onSubmit(event)}
            >
              <div className="flex flex-col gap-1">
                <Label>{t("features.menus.form.parent")}</Label>
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={t("features.menus.form.parent")}
                    className="flex-1"
                    isDisabled={mode === "addChild"}
                    placeholder={t("features.menus.form.parentPlaceholder")}
                    value={values.parentId || null}
                    variant="secondary"
                    onChange={(key) =>
                      setValue("parentId", key ? String(key) : "")
                    }
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {parentOptions.map((option) => {
                          const origin = nodeById.get(option.id);

                          return (
                            <ListBox.Item
                              key={option.id}
                              id={option.id}
                              textValue={option.label.trim()}
                            >
                              <span
                                className="flex items-center gap-1.5"
                                style={{
                                  paddingInlineStart: option.depth * 16,
                                }}
                              >
                                {origin?.icon ? (
                                  <DynamicIcon
                                    aria-hidden
                                    className="size-4 text-muted"
                                    name={origin.icon as IconName}
                                    size={16}
                                  />
                                ) : null}
                                {option.label}
                              </span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {values.parentId && mode !== "addChild" && (
                    <Button
                      isIconOnly
                      aria-label={t("features.menus.form.parentClear")}
                      size="sm"
                      variant="ghost"
                      onPress={() => setValue("parentId", "")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <Description>{t("features.menus.form.parentHint")}</Description>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="label"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.menus.form.label")}</Label>
                      <Input
                        maxLength={50}
                        placeholder={t("features.menus.form.labelPlaceholder")}
                        variant="secondary"
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.menus.form.labelInvalid")}
                        </FieldError>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={control}
                  name="i18nKey"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.menus.form.i18nKey")}</Label>
                      <Input placeholder="menu.xxx.yyy" variant="secondary" />
                      {fieldState.error && (
                        <FieldError>
                          {!field.value?.trim()
                            ? t("features.menus.form.i18nKeyRequired")
                            : t("features.menus.form.i18nKeyFormat")}
                        </FieldError>
                      )}
                    </TextField>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="icon"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.menus.form.icon")}</Label>
                      <Input
                        aria-label="Icon"
                        placeholder="house"
                        variant="secondary"
                      />
                      {/* 输入末尾实时预览：裸 lucide 名有效时渲染图标，为空不渲染 */}
                      {field.value ? (
                        <span className="grid size-4 place-items-center">
                          <DynamicIcon
                            aria-hidden
                            className="text-muted"
                            name={field.value as IconName}
                            size={16}
                          />
                        </span>
                      ) : null}
                      {fieldState.error && (
                        <FieldError>
                          {t("features.menus.form.iconRequired")}
                        </FieldError>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={control}
                  name="to"
                  render={({ field, fieldState }) => (
                    <TextField
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.menus.form.route")}</Label>
                      <Input
                        placeholder={t("features.menus.form.routePlaceholder")}
                        variant="secondary"
                      />
                      {fieldState.error ? (
                        <FieldError>
                          {t("features.menus.form.routeFormat")}
                        </FieldError>
                      ) : (
                        <Description>
                          {t("features.menus.form.routeHint")}
                        </Description>
                      )}
                    </TextField>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>{t("features.menus.form.permissions")}</Label>
                <Select
                  aria-label={t("features.menus.form.permissions")}
                  placeholder={t("features.menus.form.permissionsPlaceholder")}
                  selectionMode="multiple"
                  value={(permissionItems ?? [])
                    .filter((item) => {
                      const bits = BigInt(item.bits);

                      return bits !== 0n && (permBits & bits) === bits;
                    })
                    .map((item) => item.value)}
                  variant="secondary"
                  onChange={(keys) => {
                    const selected = new Set((keys ?? []).map(String));
                    let next = 0n;

                    for (const item of permissionItems ?? []) {
                      if (selected.has(item.value)) next |= BigInt(item.bits);
                    }
                    setPermBits(next);
                  }}
                >
                  <Select.Trigger>
                    <Select.Value>
                      {selectedPermissionNames.length > 0 ? (
                        <span className="truncate">
                          {selectedPermissionNames.join("、")}
                        </span>
                      ) : (
                        <span className="text-muted">
                          {t("features.menus.form.permissionsPlaceholder")}
                        </span>
                      )}
                    </Select.Value>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox selectionMode="multiple">
                      {(permissionItems ?? []).map((item) => {
                        const key = `features.permissions.items.${item.value}`;
                        const name = t(key);

                        return (
                          <ListBox.Item
                            key={item.value}
                            id={item.value}
                            textValue={name === key ? item.label : name}
                          >
                            <span className="flex items-center gap-1.5">
                              {item.icon ? (
                                <DynamicIcon
                                  aria-hidden
                                  className="size-4 text-muted"
                                  name={item.icon as IconName}
                                  size={16}
                                />
                              ) : null}
                              {name === key ? item.label : name}
                            </span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <SortField
                value={values.sort}
                onChange={(value) =>
                  setValue("sort", value, { shouldValidate: true })
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SwitchRow
                  checked={values.keepAlive}
                  label={t("features.menus.form.keepAlive")}
                  onChange={(checked) => setValue("keepAlive", checked)}
                />
                <SwitchRow
                  checked={values.hideInMenu}
                  label={t("features.menus.form.hideInMenu")}
                  onChange={(checked) => setValue("hideInMenu", checked)}
                />
                <SwitchRow
                  checked={values.enabled}
                  label={t("features.menus.form.enabled")}
                  onChange={(checked) => setValue("enabled", checked)}
                />
                <SwitchRow
                  checked={values.defaultOpen}
                  label={t("features.menus.form.defaultOpen")}
                  onChange={(checked) => setValue("defaultOpen", checked)}
                />
              </div>
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
                    {t("features.menus.form.saving")}
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

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 左 Label 右 Switch 的单行开关 */
function SwitchRow({ label, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
      <Label>{label}</Label>
      <Switch aria-label={label} isSelected={checked} onChange={onChange}>
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
}
