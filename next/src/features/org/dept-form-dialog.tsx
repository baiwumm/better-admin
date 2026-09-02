"use client";

import type {
  Dept,
  DeptCreateInput,
  DeptTreeNode,
  DeptUpdateInput,
} from "@/lib/api-types";
import type { User } from "@/lib/api-types";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
} from "@tanstack/react-query";
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
import { ListBoxLoadMoreItem } from "react-aria-components";
import { Check, X } from "lucide-react";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createDept, getDeptErrorMessage, updateDept } from "./dept-api";

import { UserInfo } from "@/components/common/user-info/user-info";
import {
  SortField,
  sortFieldSchema,
} from "@/components/common/sort-field/sort-field";
import { fetchApiList } from "@/lib/api-client";
import { useTranslation } from "@/i18n";

/**
 * 组织新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - parentId 用平铺缩进的 Select 表达树形层级（HeroUI 无 Tree 组件）；
 *   不选 = 顶级组织（提交映射 null）；编辑时禁用自身与后代（防环），
 *   停用组织不可作父级；「新增子组织」入口进入时上级锁定为所选父级；
 * - leaderId 拉取 /users（page 1, pageSize 50）选择（UserInfo 带头像展示）；
 *   无用户读取权限时降级为禁用并提示（不阻塞其余字段编辑）；
 * - 名称/编码冲突由后端 409 拦截，错误文案经 getDeptErrorMessage i18n 映射。
 */

export type DeptFormMode = "create" | "edit";

export interface DeptFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: DeptFormMode;
  /** edit：被编辑的组织；create：null */
  dept: Dept | null;
  /** create：预设的父级组织（在选中节点下新增）；edit：忽略 */
  parentNode: DeptTreeNode | null;
  /** 全量组织树（父级选择器数据源） */
  tree: DeptTreeNode[];
  /** 保存成功回调（页面统一做缓存失效与选中联动） */
  onSaved: (dept: Dept, mode: DeptFormMode) => void;
}

const FORM_ID = "dept-form";

const deptFormSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().max(50),
  /** "" = 顶级组织（提交时映射 null） */
  parentId: z.string(),
  /** "" = 不设置负责人（提交时映射 null） */
  leaderId: z.string(),
  sort: sortFieldSchema,
  status: z.enum(["enabled", "disabled"]),
});

type DeptFormValues = z.infer<typeof deptFormSchema>;

interface ParentOption {
  id: string;
  label: string;
  depth: number;
  disabled: boolean;
}

/** 树 → 平铺下拉选项（缩进层级；编辑时自身与后代禁选，停用组织禁选；不选 = 顶级） */
function buildParentOptions(
  tree: DeptTreeNode[],
  selfId: string | null,
): ParentOption[] {
  const options: ParentOption[] = [];

  const walk = (nodes: DeptTreeNode[], depth: number, underSelf: boolean) => {
    for (const node of nodes) {
      const isSelf = node.id === selfId;
      const disabled = node.status !== "enabled" || underSelf || isSelf;

      options.push({ id: node.id, label: node.name, depth, disabled });
      walk(node.children, depth + 1, underSelf || isSelf);
    }
  };

  walk(tree, 0, false);

  return options;
}

export function DeptFormDialog({
  isOpen,
  onOpenChange,
  mode,
  dept,
  parentNode,
  tree,
  onSaved,
}: DeptFormDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（DeptFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen ? (
    <DeptFormModal
      key={`${mode}:${dept?.id ?? parentNode?.id ?? "root"}`}
      isOpen
      dept={dept}
      mode={mode}
      parentNode={parentNode}
      tree={tree}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface DeptFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: DeptFormMode;
  dept: Dept | null;
  parentNode: DeptTreeNode | null;
  tree: DeptTreeNode[];
  onSaved: (dept: Dept, mode: DeptFormMode) => void;
}

function DeptFormModal({
  isOpen,
  onOpenChange,
  mode,
  dept,
  parentNode,
  tree,
  onSaved,
}: DeptFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";
  // 「新增子组织」入口（create 且带预设父级）：上级组织锁定不可修改
  const isCreateChild = mode === "create" && Boolean(parentNode);

  const { control, handleSubmit, setValue, watch } = useForm<DeptFormValues>({
    resolver: zodResolver(deptFormSchema),
    defaultValues: {
      name: dept?.name ?? "",
      code: dept?.code ?? "",
      parentId: dept ? (dept.parentId ?? "") : (parentNode?.id ?? ""),
      leaderId: dept?.leaderId ?? "",
      sort: dept?.sort ?? 0,
      status: dept?.status ?? "enabled",
    },
  });

  // 负责人候选由 <LeaderSelect> 自管理（/users 分页 + 滚动加载），见文件底部

  const mutation = useMutation({
    mutationFn: (values: DeptFormValues) => {
      if (isEdit) {
        const input: DeptUpdateInput = {
          name: values.name,
          code: values.code || null,
          parentId: values.parentId || null,
          leaderId: values.leaderId || null,
          sort: values.sort,
          status: values.status,
        };

        return updateDept(dept!.id, input);
      }

      const input: DeptCreateInput = {
        name: values.name,
        code: values.code || null,
        parentId: values.parentId || null,
        leaderId: values.leaderId || null,
        sort: values.sort,
        status: values.status,
      };

      return createDept(input);
    },
    // 提示反馈统一由 onSubmit 的 toast.promise 呈现（loading → success/error）；
    // 成功副作用（缓存失效联动、关弹窗）保留在此
    onSuccess: (saved) => {
      onSaved(saved, mode);
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    toast.promise(mutation.mutateAsync(values), {
      loading: t("features.depts.form.saving"),
      success: t(
        isEdit
          ? "features.depts.message.updated"
          : "features.depts.message.created",
      ),
      error: (error) => getDeptErrorMessage(error),
    });
  });

  const parentOptions = buildParentOptions(
    tree,
    isEdit ? (dept?.id ?? null) : null,
  );

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
                isEdit
                  ? "features.depts.form.title.edit"
                  : "features.depts.form.title.create",
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
                name="parentId"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <Label>{t("features.depts.form.parent")}</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        aria-label={t("features.depts.form.parent")}
                        className="flex-1"
                        isDisabled={isCreateChild}
                        placeholder={t("features.depts.form.parentPlaceholder")}
                        value={field.value || null}
                        variant="secondary"
                        onChange={(key) =>
                          field.onChange(key === null ? "" : String(key))
                        }
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {parentOptions.map((option) => (
                              <ListBox.Item
                                key={option.id}
                                id={option.id}
                                isDisabled={option.disabled}
                                textValue={option.label}
                              >
                                <span
                                  className="block truncate"
                                  style={{
                                    paddingInlineStart: option.depth * 16,
                                  }}
                                >
                                  {option.label}
                                </span>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {field.value && !isCreateChild && (
                        <Button
                          isIconOnly
                          aria-label={t("features.depts.form.parentClear")}
                          size="sm"
                          variant="ghost"
                          onPress={() => field.onChange("")}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                    <Description>
                      {t("features.depts.form.parentHint")}
                    </Description>
                  </div>
                )}
              />

              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    isRequired
                    className="flex flex-col gap-1"
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.depts.form.name")}</Label>
                    <Input
                      maxLength={100}
                      placeholder={t("features.depts.form.namePlaceholder")}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.depts.form.nameInvalid")}
                      </FieldError>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="code"
                render={({ field, fieldState }) => (
                  <TextField
                    className="flex flex-col gap-1"
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.depts.form.code")}</Label>
                    <Input
                      maxLength={50}
                      placeholder="DEPT-001"
                      variant="secondary"
                    />
                    {fieldState.error ? (
                      <FieldError>
                        {t("features.depts.form.codeInvalid")}
                      </FieldError>
                    ) : (
                      <Description>
                        {t("features.depts.form.codeHint")}
                      </Description>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="leaderId"
                render={({ field }) => (
                  <LeaderSelect
                    currentLeader={
                      isEdit && dept?.leaderId
                        ? {
                            id: dept.leaderId,
                            displayName: dept.leaderName ?? dept.leaderId,
                          }
                        : null
                    }
                    value={field.value}
                    onChange={(key) => field.onChange(key)}
                  />
                )}
              />

              <SortField
                value={watch("sort")}
                onChange={(value) =>
                  setValue("sort", value, { shouldValidate: true })
                }
              />

              <SwitchRow
                checked={watch("status") === "enabled"}
                label={t("features.depts.form.status")}
                onChange={(checked) =>
                  setValue("status", checked ? "enabled" : "disabled")
                }
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
                    {t("features.depts.form.saving")}
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

/** 左 Label 右 Switch 的单行开关（对齐菜单管理表单布局） */
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

const LEADER_PAGE_SIZE = 50;

/** 编辑回显兜底候选：当前负责人不在已加载用户列表中时，渲染为列表首条 */
interface CurrentLeader {
  id: string;
  displayName: string;
}

/**
 * 负责人选择器：/users 分页下拉 + 滚动到底自动加载下一页
 * （react-aria ListBoxLoadMoreItem 模式，对齐 HeroUI Select 异步加载示例）。
 *
 * 数据用 useInfiniteQuery 缓存（跨弹窗共享、staleTime 内开关弹窗不重复请求），
 * 滚动加载走 fetchNextPage；无权限（403）等加载失败：禁用选择器，
 * 不阻塞表单其余字段编辑。
 */
function LeaderSelect({
  value,
  onChange,
  currentLeader,
}: {
  /** 当前选中值（"" = 未选择） */
  value: string;
  onChange: (key: string) => void;
  currentLeader: CurrentLeader | null;
}) {
  const { t } = useTranslation();

  const usersQuery = useInfiniteQuery({
    queryKey: ["users", "leader-options"],
    queryFn: ({ pageParam }) =>
      fetchApiList<User>("/users", {
        page: pageParam,
        pageSize: LEADER_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * LEADER_PAGE_SIZE < lastPage.pagination.total
        ? allPages.length + 1
        : undefined,
    // 弹窗反复开关共享缓存：staleTime 内不发请求，过期后台 refetch 不打断交互
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const items = usersQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const failed = usersQuery.isError;
  // ListBoxLoadMoreItem 进入视口可能连续触发，翻页中不重复 fetchNextPage
  const handleLoadMore = useCallback(() => {
    if (!failed && usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
      void usersQuery.fetchNextPage();
    }
  }, [failed, usersQuery]);

  const currentLeaderVisible =
    !currentLeader || items.some((user) => user.id === currentLeader.id);

  return (
    <Select
      className="flex w-full flex-col gap-1"
      isDisabled={failed}
      placeholder={
        usersQuery.isLoading
          ? t("features.depts.form.leaderLoading")
          : failed
            ? t("features.depts.form.leaderLoadFailed")
            : items.length === 0 && !currentLeader
              ? t("features.depts.form.leaderEmpty")
              : t("features.depts.form.leaderPlaceholder")
      }
      value={value || null}
      variant="secondary"
      onChange={(key) => onChange(key === null ? "" : String(key))}
    >
      <Label>{t("features.depts.form.leader")}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={t("features.depts.form.leader")}>
          {!currentLeaderVisible && currentLeader && (
            <ListBox.Item
              id={currentLeader.id}
              textValue={currentLeader.displayName}
            >
              {/* 合成候选仅姓名可显示（无 username / avatar 数据） */}
              <span className="text-sm">{currentLeader.displayName}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
          {items.map((user) => (
            <ListBox.Item
              key={user.id}
              id={user.id}
              textValue={user.displayName || user.username}
            >
              <UserInfo subtitle="username" user={user} />
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
          <ListBoxLoadMoreItem
            isLoading={usersQuery.isFetchingNextPage}
            onLoadMore={handleLoadMore}
          >
            {usersQuery.hasNextPage && !failed ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Spinner size="sm" />
                <span className="text-sm text-muted">
                  {t("features.depts.form.leaderLoadingMore")}
                </span>
              </div>
            ) : null}
          </ListBoxLoadMoreItem>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
