"use client";

import type {
  DeptTreeNode,
  Post,
  PostCategory,
  PostCreateInput,
  PostUpdateInput,
} from "@/lib/api-types";

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
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createPost, getPostErrorMessage, updatePost } from "./post-api";
import { DeptTreeSelect } from "./dept-tree-select";

import { useTranslation } from "@/i18n";

/**
 * 岗位新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - deptId 用 DeptTreeSelect（平铺缩进树形下拉；不选时为必填校验阻断提交）；
 * - 岗位类别三选一（管理岗 / 专业岗 / 生产岗）；
 * - 同组织岗位名冲突由后端 409（POST_NAME_EXISTS）拦截，文案经 i18n 映射。
 */

export type PostFormMode = "create" | "edit";

export interface PostFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: PostFormMode;
  /** edit：被编辑的岗位；create：null */
  post: Post | null;
  /** 全量组织树（所属组织选择器数据源） */
  tree: DeptTreeNode[];
  /** 保存成功回调（页面统一做缓存失效） */
  onSaved: (post: Post, mode: PostFormMode) => void;
}

const FORM_ID = "post-form";

const postFormSchema = z.object({
  name: z.string().trim().min(1).max(100),
  /** "" = 未选择（提交时阻断提示必填） */
  deptId: z.string().min(1),
  category: z.enum(["management", "professional", "production"]),
  rank: z.string().trim().max(20),
  status: z.enum(["enabled", "disabled"]),
});

type PostFormValues = z.infer<typeof postFormSchema>;

const CATEGORY_OPTIONS: PostCategory[] = [
  "management",
  "professional",
  "production",
];

export function PostFormDialog({
  isOpen,
  onOpenChange,
  mode,
  post,
  tree,
  onSaved,
}: PostFormDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（PostFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen ? (
    <PostFormModal
      key={`${mode}:${post?.id ?? "new"}`}
      isOpen
      mode={mode}
      post={post}
      tree={tree}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface PostFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: PostFormMode;
  post: Post | null;
  tree: DeptTreeNode[];
  onSaved: (post: Post, mode: PostFormMode) => void;
}

function PostFormModal({
  isOpen,
  onOpenChange,
  mode,
  post,
  tree,
  onSaved,
}: PostFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";

  const { control, handleSubmit } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      name: post?.name ?? "",
      deptId: post?.deptId ?? "",
      category: post?.category ?? "management",
      rank: post?.rank ?? "",
      status: post?.status ?? "enabled",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PostFormValues) => {
      if (isEdit) {
        const input: PostUpdateInput = {
          name: values.name,
          deptId: values.deptId,
          category: values.category,
          rank: values.rank,
          status: values.status,
        };

        return updatePost(post!.id, input);
      }

      const input: PostCreateInput = {
        name: values.name,
        deptId: values.deptId,
        category: values.category,
        rank: values.rank,
        status: values.status,
      };

      return createPost(input);
    },
    // 提示反馈由 onSubmit 的 toast.promise 呈现；成功副作用（失效联动、关弹窗）在此
    onSuccess: (saved) => {
      onSaved(saved, mode);
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    toast.promise(mutation.mutateAsync(values), {
      loading: t("features.posts.form.saving"),
      success: t(
        isEdit
          ? "features.posts.message.updated"
          : "features.posts.message.created",
      ),
      error: (error) => getPostErrorMessage(error),
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
                isEdit
                  ? "features.posts.form.title.edit"
                  : "features.posts.form.title.create",
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
                name="deptId"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <Label>{t("features.posts.form.dept")}</Label>
                    <DeptTreeSelect
                      ariaLabel={t("features.posts.form.dept")}
                      className="w-full"
                      isDisabled={isEdit && Boolean(field.value)}
                      tree={tree}
                      value={field.value}
                      onChange={(key) => field.onChange(key)}
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.posts.form.deptRequired")}
                      </FieldError>
                    )}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <TextField
                      isRequired
                      className="flex flex-col"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.posts.form.name")}</Label>
                      <Input
                        maxLength={100}
                        placeholder={t("features.posts.form.namePlaceholder")}
                        variant="secondary"
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.posts.form.nameInvalid")}
                        </FieldError>
                      )}
                    </TextField>
                    <Description>
                      {t("features.posts.form.nameHint")}
                    </Description>
                  </div>
                )}
              />

              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    aria-label={t("features.posts.form.category")}
                    className="flex w-full flex-col gap-1"
                    placeholder={t("features.posts.form.categoryPlaceholder")}
                    value={field.value}
                    variant="secondary"
                    onChange={(key) =>
                      field.onChange(
                        key === null
                          ? "management"
                          : String(key as PostCategory),
                      )
                    }
                  >
                    <Label>{t("features.posts.form.category")}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CATEGORY_OPTIONS.map((option) => (
                          <ListBox.Item
                            key={option}
                            id={option}
                            textValue={t(`features.posts.category.${option}`)}
                          >
                            {t(`features.posts.category.${option}`)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />

              <Controller
                control={control}
                name="rank"
                render={({ field, fieldState }) => (
                  <TextField
                    className="flex flex-col gap-1"
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.posts.form.rank")}</Label>
                    <Input
                      maxLength={20}
                      placeholder={t("features.posts.form.rankPlaceholder")}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.posts.form.rankInvalid")}
                      </FieldError>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
                    <Label>{t("features.posts.form.status")}</Label>
                    <Switch
                      aria-label={t("features.posts.form.status")}
                      isSelected={field.value === "enabled"}
                      onChange={(selected) =>
                        field.onChange(selected ? "enabled" : "disabled")
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
                    {t("features.posts.form.saving")}
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
