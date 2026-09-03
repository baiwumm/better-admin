import type {
  DeptTreeNode,
  NoticeCreateInput,
  NoticeDetail,
  NoticeScope,
  NoticeUpdateInput,
  User,
} from "@/lib/api-types";

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
  Modal,
  Skeleton,
  Spinner,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { parseDateTime } from "@internationalized/date";
import { Check, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { createNotice, fetchNoticeDetail, updateNotice } from "./notice-api";
import { NoticeScopeSelector } from "./notice-scope-selector";
import { RichTextEditor } from "./rich-text-editor";

import { fetchApiList } from "@/lib/api-client";
import { useTranslation } from "@/i18n";

/**
 * 公告发布/编辑弹窗（契约 v1.7.0）。
 *
 * - 内容为 Tiptap 富文本（RichTextEditor，提交 HTML）；
 * - 发布范围三粒度并集（NoticeScopeSelector，三类目标分别受控，
 *   「至少一项」校验失败经 onInvalid toast 明确反馈）；
 * - 发布时间 DatePicker：缺省 = 立即发布；未来时间 = 定时草稿（@Cron 自动发布）；
 * - 编辑态由内部按 noticeId 拉取详情（含 scopes），列表行仅传 id——
 *   列表 Notice 不含 scopes，外层强转会丢范围数据；
 * - Modal 结构渲染在有 mutation 的内层组件（NoticeFormModal），
 *   保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）。
 */

export type NoticeFormMode = "create" | "edit";

export interface NoticeFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: NoticeFormMode;
  /** edit：被编辑公告的 id（详情由内部拉取）；create：null */
  noticeId: string | null;
  /** 全量组织树（范围选择器数据源） */
  tree: DeptTreeNode[];
  /** 保存成功回调（页面统一做缓存失效） */
  onSaved: (notice: NoticeDetail, mode: NoticeFormMode) => void;
}

const FORM_ID = "notice-form";

/** ISO 时间戳 → 本地 "YYYY-MM-DDTHH:mm"（DatePicker minute 粒度的受控值） */
function toLocalMinuteInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const noticeFormSchema = z
  .object({
    title: z.string().trim().min(1).max(50),
    content: z.string().trim().min(1),
    // 发布范围：三类目标分别受控，并集语义
    scopeDeptIds: z.array(z.string()),
    scopePostIds: z.array(z.string()),
    scopeUserIds: z.array(z.string()),
    isTop: z.boolean(),
    /** "" = 立即发布 */
    publishDate: z.string(),
  })
  .refine(
    (v) =>
      v.scopeDeptIds.length + v.scopePostIds.length + v.scopeUserIds.length > 0,
    { message: "scopeRequired", path: ["scopeDeptIds"] },
  );

type NoticeFormValues = z.infer<typeof noticeFormSchema>;

export function NoticeFormDialog({
  isOpen,
  onOpenChange,
  mode,
  noticeId,
  tree,
  onSaved,
}: NoticeFormDialogProps) {
  return isOpen ? (
    <NoticeFormModal
      isOpen
      mode={mode}
      noticeId={noticeId}
      tree={tree}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface NoticeFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: NoticeFormMode;
  noticeId: string | null;
  tree: DeptTreeNode[];
  onSaved: (notice: NoticeDetail, mode: NoticeFormMode) => void;
}

function NoticeFormModal({
  isOpen,
  onOpenChange,
  mode,
  noticeId,
  tree,
  onSaved,
}: NoticeFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";

  // 编辑态拉详情（含 scopes）：列表行 Notice 不带范围明细，不能强转使用
  const detailQuery = useQuery({
    queryKey: ["notices", "detail", noticeId ?? ""],
    queryFn: () => fetchNoticeDetail(noticeId!),
    enabled: isEdit && Boolean(noticeId),
    staleTime: 0,
  });
  const notice = detailQuery.data ?? null;

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<NoticeFormValues>({
      resolver: zodResolver(noticeFormSchema),
      defaultValues: {
        title: "",
        content: "",
        scopeDeptIds: [],
        scopePostIds: [],
        scopeUserIds: [],
        isTop: false,
        publishDate: "",
      },
    });

  // 详情异步到达后回填：副作用必须走 useEffect（而非 useMemo——后者在渲染期间
  // 执行 setValue 会触发 react-hook-form 状态更新被 React 丢弃/不触发重渲染，
  // 导致「值已写入但界面不回显，保存却成功」：首次编辑详情异步到达尚能生效，
  // 再次编辑命中缓存、挂载首帧即有值必现）。reset 一次性整体回填，避免多次 setValue。
  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (!notice || hasPrefilled.current) return;
    hasPrefilled.current = true;
    reset({
      title: notice.title,
      content: notice.content ?? "",
      scopeDeptIds: notice.scopes
        .filter((s) => s.scopeType === "dept")
        .map((s) => s.targetId),
      scopePostIds: notice.scopes
        .filter((s) => s.scopeType === "post")
        .map((s) => s.targetId),
      scopeUserIds: notice.scopes
        .filter((s) => s.scopeType === "user")
        .map((s) => s.targetId),
      isTop: notice.isTop,
      publishDate: toLocalMinuteInput(notice.publishTime),
    });
  }, [notice, reset]);

  // 数据源：岗位选项 + 人员候选（首页 50 条，与负责人选择器同源）
  const { data: postOptionsRes } = useQuery({
    queryKey: ["org", "posts", "options"],
    queryFn: () =>
      fetchApiList<{
        id: string;
        name: string;
        deptPath: string;
        status: string;
      }>("/org/posts", { page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });
  const postOptions = postOptionsRes?.data ?? [];
  const { data: usersRes } = useQuery({
    queryKey: ["users", "notice-scope-options"],
    queryFn: () => fetchApiList<User>("/users", { page: 1, pageSize: 50 }),
    staleTime: 60_000,
  });
  const userOptions = usersRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: (values: NoticeFormValues) => {
      // 范围三粒度并集：选择器按类型分组，直接合成目标数组
      const scopeTargets: NoticeScope[] = [
        ...values.scopeDeptIds.map((targetId) => ({
          scopeType: "dept" as const,
          targetId,
          targetName: null,
        })),
        ...values.scopePostIds.map((targetId) => ({
          scopeType: "post" as const,
          targetId,
          targetName: null,
        })),
        ...values.scopeUserIds.map((targetId) => ({
          scopeType: "user" as const,
          targetId,
          targetName: null,
        })),
      ];

      if (isEdit) {
        const input: NoticeUpdateInput = {
          title: values.title,
          content: values.content,
          scopeTargets,
          isTop: values.isTop,
          publishTime: values.publishDate || null,
        };

        return updateNotice(noticeId!, input);
      }

      const input: NoticeCreateInput = {
        title: values.title,
        content: values.content,
        scopeTargets,
        isTop: values.isTop,
        publishTime: values.publishDate || null,
      };

      return createNotice(input);
    },
    // 提示反馈统一由 onSubmit 的 toast.promise 呈现；成功副作用保留在此
    onSuccess: (saved) => {
      onSaved(saved, mode);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : String(error));
    },
  });

  const onValid = handleSubmit(
    (values) => {
      toast.promise(mutation.mutateAsync(values), {
        loading: t("features.notices.form.saving"),
        success: t(
          isEdit
            ? "features.notices.message.updated"
            : "features.notices.message.created",
        ),
        error: (error) =>
          error instanceof Error ? error.message : String(error),
      });
    },
    // 校验失败（如范围未选）：toast 明确反馈，不让「点确认没反应」
    () => {
      toast.danger(t("features.notices.form.invalidScope"));
    },
  );

  const onSubmit = (event: React.FormEvent) => void onValid(event);

  return (
    <Modal.Backdrop
      isKeyboardDismissDisabled
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-2xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {t(
                isEdit
                  ? "features.notices.form.title.edit"
                  : "features.notices.form.title.create",
              )}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {isEdit && detailQuery.isLoading ? (
              /* 逼真骨架屏：对齐表单实际布局（标题/编辑器/范围/双列行） */
              <div aria-hidden className="flex flex-col gap-4">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-7 w-48 rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton className="h-12 w-full rounded-3xl" />
                  <Skeleton className="h-12 w-full rounded-3xl" />
                </div>
              </div>
            ) : (
              <Form
                className="flex flex-col gap-4"
                id={FORM_ID}
                // 校验统一交给 react-hook-form（aria 行为避免 required 抢聚焦阻断提交）
                validationBehavior="aria"
                onSubmit={onSubmit}
              >
                <Controller
                  control={control}
                  name="title"
                  render={({ field, fieldState }) => (
                    <TextField
                      isRequired
                      className="flex flex-col gap-1"
                      isInvalid={Boolean(fieldState.error)}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    >
                      <Label>{t("features.notices.form.title")}</Label>
                      <Input
                        maxLength={50}
                        placeholder={t(
                          "features.notices.form.titlePlaceholder",
                        )}
                        variant="secondary"
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.notices.form.titleInvalid")}
                        </FieldError>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={control}
                  name="content"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <Label>{t("features.notices.form.content")}</Label>
                      <RichTextEditor
                        ariaLabel={t("features.notices.form.content")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.notices.form.contentRequired")}
                        </FieldError>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={control}
                  name="scopeDeptIds"
                  render={({ fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <NoticeScopeSelector
                        deptIds={watch("scopeDeptIds") ?? []}
                        postIds={watch("scopePostIds") ?? []}
                        posts={postOptions}
                        tree={tree}
                        userIds={watch("scopeUserIds") ?? []}
                        users={userOptions}
                        usersLoading={false}
                        onDeptIdsChange={(ids) => setValue("scopeDeptIds", ids)}
                        onPostIdsChange={(ids) => setValue("scopePostIds", ids)}
                        onUserIdsChange={(ids) => setValue("scopeUserIds", ids)}
                      />
                      {fieldState.error && (
                        <FieldError>
                          {t("features.notices.form.scopeRequired")}
                        </FieldError>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={control}
                  name="publishDate"
                  render={({ field, fieldState }) => {
                    const dateValue = field.value
                      ? parseDateTime(field.value)
                      : null;

                    return (
                      <div className="flex flex-col gap-1">
                        <DatePicker
                          aria-label={t("features.notices.form.publishTime")}
                          className="w-full"
                          granularity="minute"
                          isInvalid={Boolean(fieldState.error)}
                          value={dateValue}
                          onChange={(value) =>
                            field.onChange(value ? value.toString() : "")
                          }
                        >
                          <Label>
                            {t("features.notices.form.publishTime")}
                          </Label>
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
                              aria-label={t(
                                "features.notices.form.publishTime",
                              )}
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
                        {fieldState.error ? (
                          <FieldError>
                            {t("features.notices.form.publishTimeInvalid")}
                          </FieldError>
                        ) : (
                          <Description>
                            {t("features.notices.form.publishTimeHint")}
                          </Description>
                        )}
                      </div>
                    );
                  }}
                />

                <Controller
                  control={control}
                  name="isTop"
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
                      <Label>{t("features.notices.form.isTop")}</Label>
                      <Switch
                        aria-label={t("features.notices.form.isTop")}
                        isSelected={field.value}
                        onChange={(selected) => field.onChange(selected)}
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
            )}
          </Modal.Body>

          <Modal.Footer className="w-full">
            <Button slot="close" variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button
              form={FORM_ID}
              isDisabled={isEdit && detailQuery.isLoading}
              isPending={mutation.isPending}
              type="submit"
            >
              {({ isPending }) =>
                isPending ? (
                  <>
                    <Spinner color="current" size="sm" />
                    {t("features.notices.form.saving")}
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
