import type { DictItem } from "@/lib/api-types";
import type { DictItemSaveInput } from "./dict-api";

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
  NumberField,
  Spinner,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { Check, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  createDictItem,
  getDictErrorMessage,
  updateDictItem,
} from "./dict-api";

import { useTranslation } from "@/i18n";

/**
 * 字典项新增/编辑弹窗（react-hook-form + zod + HeroUI Form）。
 *
 * - value 在同一类型下唯一（后端 409 DICT_ITEM_VALUE_EXISTS 拦截）；
 * - i18nKey 可选（点分键格式，label 作中文兜底）；清空传 ""（后端 ?? 兜底）；
 * - sort 升序排列、enabled 控制业务侧可见性（下拉选项只取启用项）。
 */

export type DictItemFormMode = "create" | "edit";

export interface DictItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mode: DictItemFormMode;
  /** 所属字典类型 code（create 时写入目标类型） */
  typeCode: string;
  /** edit：被编辑的字典项；create：null */
  item: DictItem | null;
  /** 保存成功回调（页面统一做缓存失效与业务字典联动刷新） */
  onSaved: () => void;
}

const FORM_ID = "dict-item-form";

/** i18n 键：点分格式（如 dict.user_status.enabled），与菜单 i18nKey 同构 */
const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

const itemFormSchema = z.object({
  value: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  i18nKey: z
    .string()
    .trim()
    .max(100)
    .refine((value) => value === "" || I18N_KEY_PATTERN.test(value)),
  sort: z.number().int().min(0).max(999),
  enabled: z.boolean(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export function DictItemFormDialog({
  isOpen,
  onOpenChange,
  mode,
  typeCode,
  item,
  onSaved,
}: DictItemFormDialogProps) {
  const { t } = useTranslation();

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
                  ? "features.dicts.form.title.editItem"
                  : "features.dicts.form.title.createItem",
              )}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {isOpen && (
              <ItemForm
                key={`${mode}:${item?.id ?? typeCode}`}
                item={item}
                mode={mode}
                typeCode={typeCode}
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

interface ItemFormProps {
  mode: DictItemFormMode;
  typeCode: string;
  item: DictItem | null;
  onDone: () => void;
  onSaved: () => void;
}

function ItemForm({ mode, typeCode, item, onDone, onSaved }: ItemFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";

  const { control, handleSubmit, watch, setValue } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      value: item?.value ?? "",
      label: item?.label ?? "",
      i18nKey: item?.i18nKey ?? "",
      sort: item?.sort ?? 0,
      enabled: item?.enabled ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      const input: DictItemSaveInput = {
        value: values.value,
        label: values.label,
        i18nKey: values.i18nKey,
        sort: values.sort,
        enabled: values.enabled,
      };

      return isEdit
        ? updateDictItem(item!.id, input)
        : createDictItem(typeCode, input);
    },
    onSuccess: () => {
      onSaved();
      toast.success(
        t(
          isEdit
            ? "features.dicts.message.itemUpdated"
            : "features.dicts.message.itemCreated",
        ),
      );
      onDone();
    },
    onError: (error) => {
      toast.danger(getDictErrorMessage(error));
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
        name="value"
        render={({ field, fieldState }) => (
          <TextField
            isRequired
            className="flex flex-col gap-1"
            isInvalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          >
            <Label>{t("features.dicts.form.value")}</Label>
            <Input maxLength={100} placeholder="1" variant="secondary" />
            {fieldState.error && (
              <FieldError>{t("features.dicts.form.valueInvalid")}</FieldError>
            )}
          </TextField>
        )}
      />

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
            <Label>{t("features.dicts.form.label")}</Label>
            <Input
              maxLength={100}
              placeholder={t("features.dicts.form.labelPlaceholder")}
              variant="secondary"
            />
            {fieldState.error && (
              <FieldError>{t("features.dicts.form.labelInvalid")}</FieldError>
            )}
          </TextField>
        )}
      />

      <Controller
        control={control}
        name="i18nKey"
        render={({ field, fieldState }) => (
          <TextField
            className="flex flex-col gap-1"
            isInvalid={Boolean(fieldState.error)}
            value={field.value ?? ""}
            onBlur={field.onBlur}
            onChange={field.onChange}
          >
            <Label>{t("features.dicts.form.i18nKey")}</Label>
            <Input
              maxLength={100}
              placeholder={`dict.${typeCode}.xxx`}
              variant="secondary"
            />
            {fieldState.error ? (
              <FieldError>{t("features.dicts.form.i18nKeyFormat")}</FieldError>
            ) : (
              <Description>{t("features.dicts.form.i18nKeyHint")}</Description>
            )}
          </TextField>
        )}
      />

      <div className="flex flex-col gap-1">
        <Label>{t("common.column.sort")}</Label>
        <NumberField
          aria-label={t("common.column.sort")}
          maxValue={999}
          minValue={0}
          value={watch("sort")}
          variant="secondary"
          onChange={(value) =>
            setValue("sort", Number.isFinite(value) ? value : 0, {
              shouldValidate: true,
            })
          }
        >
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-32" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </div>

      <Controller
        control={control}
        name="enabled"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-border px-3 py-2">
            <Label>{t("features.dicts.form.enabled")}</Label>
            <Switch
              aria-label={t("features.dicts.form.enabled")}
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
    </Form>
  );
}
