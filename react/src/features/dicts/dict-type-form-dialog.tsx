import type { DictType } from "@/lib/api-types";
import type { DictTypeCreateInput, DictTypeUpdateInput } from "./dict-api";

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
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  createDictType,
  getDictErrorMessage,
  updateDictType,
} from "./dict-api";

import { useTranslation } from "@/i18n";

/**
 * 字典类型新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - code 仅创建时可填且创建后不可变更（编辑接口按 code 定位）；
 * - description 可选，清空传 ""（后端 ?? 兜底语义不接受 null）；
 * - code 冲突由后端 409（DICT_TYPE_CODE_EXISTS）拦截，错误文案经
 *   getDictErrorMessage 做 i18n 映射。
 */

export type DictTypeFormMode = "create" | "edit";

export interface DictTypeFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: DictTypeFormMode;
  /** edit：被编辑的类型；create：null */
  type: DictType | null;
  /** 保存成功回调（页面统一做缓存失效与选中联动；携带表单模式） */
  onSaved: (type: DictType, mode: DictTypeFormMode) => void;
}

const FORM_ID = "dict-type-form";

/** code：字母开头，允许数字/中划线/下划线（与后端约定俗成，无硬校验） */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const typeFormSchema = z.object({
  code: z.string().trim().min(1).max(50).regex(CODE_PATTERN),
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200),
});

type TypeFormValues = z.infer<typeof typeFormSchema>;

export function DictTypeFormDialog({
  isOpen,
  onOpenChange,
  mode,
  type,
  onSaved,
}: DictTypeFormDialogProps) {
  // Modal 结构渲染在有 mutation 的内层组件（TypeFormModal），
  // 保证 Modal.Footer 是 Modal.Dialog 的直接子元素（Body 滚动、Footer 固定）
  return isOpen ? (
    <TypeFormModal
      key={`${mode}:${type?.code ?? "new"}`}
      isOpen
      mode={mode}
      type={type}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  ) : null;
}

interface TypeFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: DictTypeFormMode;
  type: DictType | null;
  onSaved: (type: DictType, mode: DictTypeFormMode) => void;
}

function TypeFormModal({
  isOpen,
  onOpenChange,
  mode,
  type,
  onSaved,
}: TypeFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";

  const { control, handleSubmit } = useForm<TypeFormValues>({
    resolver: zodResolver(typeFormSchema),
    defaultValues: {
      code: type?.code ?? "",
      name: type?.name ?? "",
      description: type?.description ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: TypeFormValues) => {
      if (isEdit) {
        const input: DictTypeUpdateInput = {
          name: values.name,
          description: values.description,
        };

        return updateDictType(type!.code, input);
      }

      const input: DictTypeCreateInput = {
        code: values.code,
        name: values.name,
        description: values.description || undefined,
      };

      return createDictType(input);
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
      loading: t("features.dicts.form.saving"),
      success: t(
        isEdit
          ? "features.dicts.message.typeUpdated"
          : "features.dicts.message.typeCreated",
      ),
      error: (error) => getDictErrorMessage(error),
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
                  ? "features.dicts.form.title.editType"
                  : "features.dicts.form.title.createType",
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
                    <Label>{t("features.dicts.form.code")}</Label>
                    <Input
                      maxLength={50}
                      placeholder="user_status"
                      variant="secondary"
                    />
                    {fieldState.error ? (
                      <FieldError>
                        {!field.value?.trim()
                          ? t("features.dicts.form.codeRequired")
                          : t("features.dicts.form.codeFormat")}
                      </FieldError>
                    ) : (
                      <Description>
                        {t("features.dicts.form.codeHint")}
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
                    isInvalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  >
                    <Label>{t("features.dicts.form.name")}</Label>
                    <Input
                      maxLength={50}
                      placeholder={t("features.dicts.form.namePlaceholder")}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.dicts.form.nameInvalid")}
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
                    <Label>{t("features.dicts.form.description")}</Label>
                    <TextArea
                      maxLength={200}
                      placeholder={t(
                        "features.dicts.form.descriptionPlaceholder",
                      )}
                      rows={3}
                      variant="secondary"
                    />
                    {fieldState.error && (
                      <FieldError>
                        {t("features.dicts.form.descriptionInvalid")}
                      </FieldError>
                    )}
                  </TextField>
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
                    {t("features.dicts.form.saving")}
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
