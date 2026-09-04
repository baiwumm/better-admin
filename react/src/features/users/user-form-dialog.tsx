import type { Key } from "@heroui/react";
import type { Role, User } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
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
import { parseDate } from "@internationalized/date";
import { Check, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { z } from "zod";

import {
  ROLE_OPTIONS_QUERY_KEY,
  createUser,
  fetchRoleOptions,
  getUserErrorMessage,
  updateUser,
} from "./user-api";
import { PasswordField } from "./password-field";

import { DeptTreeSelect } from "@/features/org/dept-tree-select";
import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "@/features/org/dept-api";
import { fetchPosts } from "@/features/org/post-api";
import { useTranslation } from "@/i18n";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 用户新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - username 仅创建时可填且创建后不可变更（后端契约锁定）；
 * - 编辑态不含密码字段：改密走「重置密码」弹窗（POST /users/:id/reset-password），
 *   编辑接口本身不接收 password；
 * - username/email 唯一性由后端 409（USERNAME_EXISTS / EMAIL_EXISTS）拦截；
 * - roleIds / postIds 为全量替换语义：编辑时始终下发完整数组（含空数组 = 清空）；
 * - 组织中心关联（契约 v1.6.0）：所属组织（DeptTreeSelect）/ 岗位多选 + 主岗
 *   （选项限定已选岗位）/ 工号 / 入职日期（DatePicker）/ 在职状态 / 性别；
 *   表单提交即全量下发（含空值 = 清空），与「所见即所得」一致；
 * - Modal 结构渲染在有 mutation 的内层组件（UserFormModal），
 *   保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）。
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
      // 组织中心关联（契约 v1.6.0）："" = 未设置（提交映射 null）；
      // entryDate 仅接受 YYYY-MM-DD 或空；在职状态恒为显式值（存量 NULL 视为 employed）
      deptId: z.string(),
      employeeNo: z.string().trim().max(50),
      entryDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "entryDateInvalid")
        .or(z.literal("")),
      employmentStatus: z.enum(["employed", "resigned"]),
      gender: z.enum(["male", "female"]).or(z.literal("")),
      postIds: z.array(z.string()).max(20, "postsMax"),
      mainPostId: z.string(),
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
  return isOpen ? (
    <UserFormModal
      key={`${mode}:${user?.id ?? "new"}`}
      isOpen
      mode={mode}
      user={user}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface UserFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: UserFormMode;
  user: User | null;
  onSaved: () => void;
}

function UserFormModal({
  isOpen,
  onOpenChange,
  mode,
  user,
  onSaved,
}: UserFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";
  const currentUserId = useAuthStore((state) => state.user?.id);
  const currentUserIsSuperAdmin = useAuthStore(
    (state) => state.user?.roles.includes("super_admin") ?? false,
  );

  // v1.4.6 保护：编辑受保护用户时锁定状态开关（后端拒绝停用请求，前端禁用入口）；
  // 操作者自身为 super_admin 时豁免 super_admin 角色规则，与列表页口径一致
  const isStatusLocked =
    isEdit &&
    user !== null &&
    (user.id === currentUserId ||
      user.username === "admin" ||
      (user.roles.some((r) => r.code === "super_admin") &&
        !currentUserIsSuperAdmin));

  const formSchema = useMemo(() => buildUserFormSchema(isEdit), [isEdit]);
  const { control, handleSubmit, setValue, watch } = useForm<UserFormValues>({
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
      // 组织中心关联回显（契约 v1.6.0）：主岗取 posts 中 isMain 的一条；
      // 在职状态存量 NULL 视为 employed（保存后落显式值）
      deptId: user?.deptId ?? "",
      employeeNo: user?.employeeNo ?? "",
      entryDate: user?.entryDate ?? "",
      employmentStatus: user?.employmentStatus ?? "employed",
      gender: user?.gender ?? "",
      postIds: user?.posts.map((post) => post.id) ?? [],
      mainPostId: user?.posts.find((post) => post.isMain)?.id ?? "",
    },
  });

  // 角色下拉选项：仅启用角色；pageSize 上限 50，超出由 fetchRoleOptions 续拉
  const { data: fetchedRoleOptions = [], isLoading: rolesLoading } = useQuery({
    enabled: true,
    queryKey: ROLE_OPTIONS_QUERY_KEY,
    queryFn: fetchRoleOptions,
    staleTime: 60_000,
  });

  // super_admin 绑定保护（前端止损）：非超管操作者不可见/不可选 super_admin 角色，
  // 与后端 POST/PUT /users 绑定校验同口径（超管间互操作豁免）
  const roleOptions = useMemo(
    () =>
      currentUserIsSuperAdmin
        ? fetchedRoleOptions
        : fetchedRoleOptions.filter(
            (role: Role) => role.code !== SUPER_ADMIN_ROLE_CODE,
          ),
    [fetchedRoleOptions, currentUserIsSuperAdmin],
  );

  // 组织中心数据源：组织树（与组织/岗位页共享缓存）+ 岗位选项（首页 50 条）
  const { data: deptTree = [] } = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    staleTime: 60_000,
  });
  const { data: postOptionsRes } = useQuery({
    queryKey: ["org", "posts", "options"],
    queryFn: () => fetchPosts({ page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });
  const postOptions = postOptionsRes?.data ?? [];

  // 取消勾选已设为主岗的岗位时联动清空 mainPostId：
  // 否则残留值随载荷提交，被后端 assertValidMainPost 400 拒绝
  const watchedPostIds = useWatch({ control, name: "postIds" });
  const watchedMainPostId = useWatch({ control, name: "mainPostId" });

  useEffect(() => {
    if (watchedMainPostId && !watchedPostIds.includes(watchedMainPostId)) {
      setValue("mainPostId", "");
    }
  }, [watchedPostIds, watchedMainPostId, setValue]);

  const mutation = useMutation({
    mutationFn: (values: UserFormValues) => {
      if (isEdit) {
        return updateUser(user!.id, {
          email: values.email,
          displayName: values.displayName,
          status: values.status,
          roleIds: values.roleIds,
          // 组织中心关联（契约 v1.6.0）：表单全量下发（含空值 = 清空），所见即所得
          deptId: values.deptId || null,
          employeeNo: values.employeeNo || null,
          entryDate: values.entryDate || null,
          employmentStatus: values.employmentStatus,
          gender: values.gender || null,
          postIds: values.postIds,
          mainPostId: values.mainPostId || null,
        });
      }

      return createUser({
        username: values.username,
        email: values.email,
        displayName: values.displayName,
        password: values.password,
        status: values.status,
        roleIds: values.roleIds,
        deptId: values.deptId || null,
        employeeNo: values.employeeNo || null,
        entryDate: values.entryDate || null,
        employmentStatus: values.employmentStatus,
        gender: values.gender || null,
        postIds: values.postIds,
        mainPostId: values.mainPostId || null,
      });
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
      loading: t("features.users.form.saving"),
      success: t(
        isEdit
          ? "features.users.message.updateSuccess"
          : "features.users.message.createSuccess",
      ),
      error: (error) => getUserErrorMessage(error),
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
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {t(
                isEdit
                  ? "features.users.form.title.edit"
                  : "features.users.form.title.create",
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
                      <Description>
                        {t("features.users.form.usernameHint")}
                      </Description>
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
                      placeholder={t(
                        "features.users.form.displayNamePlaceholder",
                      )}
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
                      <FieldError>
                        {t("features.users.form.emailInvalid")}
                      </FieldError>
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
                        placeholder={t(
                          "features.users.form.passwordPlaceholder",
                        )}
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
                        isDisabled={isStatusLocked}
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
                        <FieldError>
                          {t("features.users.form.rolesMax")}
                        </FieldError>
                      )}
                    </div>
                  );
                }}
              />

              {/* 组织中心关联（契约 v1.6.0 阶段 2）：所属组织 / 岗位 / 主岗 */}
              <Controller
                control={control}
                name="deptId"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <Label>{t("features.users.form.dept")}</Label>
                    <DeptTreeSelect
                      ariaLabel={t("features.users.form.dept")}
                      className="w-full"
                      tree={deptTree}
                      value={field.value}
                      onChange={(key) => field.onChange(key)}
                    />
                    <Description>
                      {t("features.users.form.deptHint")}
                    </Description>
                  </div>
                )}
              />

              <Controller
                control={control}
                name="postIds"
                render={({ field, fieldState }) => {
                  const selected = field.value as Key[];

                  return (
                    <div className="flex flex-col gap-1">
                      <Select
                        className="w-full"
                        isInvalid={Boolean(fieldState.error)}
                        placeholder={
                          postOptions.length === 0
                            ? t("features.users.form.postsEmpty")
                            : t("features.users.form.postsPlaceholder")
                        }
                        selectionMode="multiple"
                        value={selected}
                        variant="secondary"
                        onChange={(keys) =>
                          field.onChange(((keys as Key[]) ?? []).map(String))
                        }
                      >
                        <Label>{t("features.users.form.posts")}</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox selectionMode="multiple">
                            {postOptions.map((post) => (
                              <ListBox.Item
                                key={post.id}
                                id={post.id}
                                isDisabled={post.status !== "enabled"}
                                textValue={post.name}
                              >
                                <span className="flex flex-col">
                                  <span>{post.name}</span>
                                  <span className="text-xs text-muted">
                                    {post.deptPath}
                                  </span>
                                </span>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {fieldState.error && (
                        <FieldError>
                          {t("features.users.form.postsMax")}
                        </FieldError>
                      )}
                      <Description>
                        {t("features.users.form.postsHint")}
                      </Description>
                    </div>
                  );
                }}
              />

              <Controller
                control={control}
                name="mainPostId"
                render={({ field }) => {
                  // 主岗选项 = 已选岗位（主岗必须在 postIds 中，选项天然满足约束）
                  const selectedPostIds = watch("postIds");
                  const mainOptions = postOptions.filter((post) =>
                    selectedPostIds.includes(post.id),
                  );

                  return (
                    <div className="flex flex-col gap-1">
                      <Select
                        aria-label={t("features.users.form.mainPost")}
                        className="w-full"
                        isDisabled={mainOptions.length === 0}
                        placeholder={t("features.users.form.mainPostEmpty")}
                        value={field.value || null}
                        variant="secondary"
                        onChange={(key) =>
                          field.onChange(key === null ? "" : String(key))
                        }
                      >
                        <Label>{t("features.users.form.mainPost")}</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item
                              id=""
                              textValue={t("features.users.form.mainPostEmpty")}
                            >
                              {t("features.users.form.mainPostEmpty")}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            {mainOptions.map((post) => (
                              <ListBox.Item
                                key={post.id}
                                id={post.id}
                                textValue={post.name}
                              >
                                {post.name}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Description>
                        {t("features.users.form.mainPostHint")}
                      </Description>
                    </div>
                  );
                }}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="employeeNo"
                  render={({ field, fieldState }) => (
                    <TextField
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.users.form.employeeNo")}</Label>
                      <Input
                        maxLength={50}
                        placeholder={t(
                          "features.users.form.employeeNoPlaceholder",
                        )}
                        variant="secondary"
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.users.form.employeeNoInvalid")}
                        </FieldError>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={control}
                  name="entryDate"
                  render={({ field, fieldState }) => {
                    // DatePicker 受控值用 DateValue：表单存 "YYYY-MM-DD" 字符串，
                    // parseDate / toString 双向转换（空串 = 未设置）
                    const dateValue = field.value
                      ? parseDate(field.value)
                      : null;

                    return (
                      <div className="flex flex-col gap-1">
                        <DatePicker
                          aria-label={t("features.users.form.entryDate")}
                          className="w-full"
                          isInvalid={Boolean(fieldState.error)}
                          value={dateValue}
                          onChange={(value) =>
                            field.onChange(value ? value.toString() : "")
                          }
                        >
                          <Label>{t("features.users.form.entryDate")}</Label>
                          <DateField.Group fullWidth className="bg-default">
                            <DateField.Input>
                              {(segment) => (
                                <DateField.Segment segment={segment} />
                              )}
                            </DateField.Input>
                            <DateField.Suffix>
                              <DatePicker.Trigger>
                                <DatePicker.TriggerIndicator />
                              </DatePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <DatePicker.Popover>
                            <Calendar
                              aria-label={t("features.users.form.entryDate")}
                            >
                              <Calendar.Header>
                                <Calendar.YearPickerTrigger>
                                  <Calendar.YearPickerTriggerHeading />
                                  <Calendar.YearPickerTriggerIndicator />
                                </Calendar.YearPickerTrigger>
                                <Calendar.NavButton slot="previous" />
                                <Calendar.NavButton slot="next" />
                              </Calendar.Header>
                              <Calendar.Grid>
                                <Calendar.GridHeader>
                                  {(day) => (
                                    <Calendar.HeaderCell>
                                      {day}
                                    </Calendar.HeaderCell>
                                  )}
                                </Calendar.GridHeader>
                                <Calendar.GridBody>
                                  {(date) => <Calendar.Cell date={date} />}
                                </Calendar.GridBody>
                              </Calendar.Grid>
                              <Calendar.YearPickerGrid>
                                <Calendar.YearPickerGridBody>
                                  {({ year }) => (
                                    <Calendar.YearPickerCell year={year} />
                                  )}
                                </Calendar.YearPickerGridBody>
                              </Calendar.YearPickerGrid>
                            </Calendar>
                          </DatePicker.Popover>
                        </DatePicker>
                        {fieldState.error && (
                          <FieldError>
                            {t("features.users.form.entryDateInvalid")}
                          </FieldError>
                        )}
                      </div>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="employmentStatus"
                  render={({ field }) => (
                    <Select
                      aria-label={t("features.users.form.employmentStatus")}
                      className="flex w-full flex-col gap-1"
                      value={field.value}
                      variant="secondary"
                      onChange={(key) =>
                        field.onChange(
                          key === null
                            ? "employed"
                            : String(key as "employed" | "resigned"),
                        )
                      }
                    >
                      <Label>{t("features.users.form.employmentStatus")}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="employed"
                            textValue={t("features.users.employment.employed")}
                          >
                            {t("features.users.employment.employed")}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="resigned"
                            textValue={t("features.users.employment.resigned")}
                          >
                            {t("features.users.employment.resigned")}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />

                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      aria-label={t("features.users.form.gender")}
                      className="flex w-full flex-col gap-1"
                      placeholder={t("features.users.gender.unset")}
                      value={field.value || null}
                      variant="secondary"
                      onChange={(key) =>
                        field.onChange(
                          key === null ? "" : String(key as "male" | "female"),
                        )
                      }
                    >
                      <Label>{t("features.users.form.gender")}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="male"
                            textValue={t("features.users.gender.male")}
                          >
                            {t("features.users.gender.male")}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="female"
                            textValue={t("features.users.gender.female")}
                          >
                            {t("features.users.gender.female")}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
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
                    {t("features.users.form.saving")}
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
