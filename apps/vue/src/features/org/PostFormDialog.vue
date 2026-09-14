<script setup lang="ts">
import type { DeptTreeNode, Post } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";
import Spinner from "@/components/ui/spinner/index.vue";
import * as z from "zod";
import { computed, reactive, ref, useTemplateRef, watch, h } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { createPost, getPostErrorMessage, updatePost } from "./post-api";
import DeptTreeSelect from "./DeptTreeSelect.vue";

/**
 * 岗位新增/编辑弹窗（对应 React 端 post-form-dialog.tsx）：
 * UForm + zod schema 校验（官方范式，@submit 仅在校验通过后触发）。
 *
 * - deptId 用平铺缩进的树选择器（DeptTreeSelect），必填校验阻断提交；
 * - 岗位类别三选一（管理岗 / 专业岗 / 生产岗）；
 * - 同组织岗位名冲突由后端 409（POST_NAME_EXISTS）拦截，
 *   错误文案经 getPostErrorMessage i18n 映射。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  /** edit：被编辑的岗位；create：null */
  post: Post | null;
  /** 全量组织树（所属组织选择器数据源） */
  tree: DeptTreeNode[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一做缓存失效） */
  saved: [post: Post, mode: "create" | "edit"];
}>();

const { t } = useI18n();
const toast = useToast();

const FORM_ID = "post-form";

/** 字数统计上限（与后端 @Length 校验及 React 端对齐：名称 100 / 职级 20） */
const NAME_MAX_LENGTH = 100;
const RANK_MAX_LENGTH = 20;

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z.object({
  deptId: z
    .string()
    .min(1, { error: () => t("features.posts.form.deptRequired") }),
  name: z
    .string()
    .trim()
    .min(1, { error: () => t("features.posts.form.nameInvalid") })
    .max(100, { error: () => t("features.posts.form.nameInvalid") }),
  category: z.enum(["management", "professional", "production"]),
  rank: z
    .string()
    .trim()
    .max(20, { error: () => t("features.posts.form.rankInvalid") }),
  status: z.enum(["enabled", "disabled"]),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  deptId: "",
  name: "",
  category: "management",
  rank: "",
  status: "enabled",
});
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

const isEdit = computed(() => props.mode === "edit");

const categoryOptions = computed(() =>
  (["management", "professional", "production"] as const).map((value) => ({
    label: t(`features.posts.category.${value}`),
    value,
  })),
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    state.deptId = props.post?.deptId ?? "";
    state.name = props.post?.name ?? "";
    // Post.category 契约为 string，表单只产出三枚举之一，断言收窄
    state.category = (props.post?.category ??
      "management") as Schema["category"];
    state.rank = props.post?.rank ?? "";
    state.status = props.post?.status ?? "enabled";
    formRef.value?.clear();
  },
  { immediate: true },
);

function close() {
  emit("update:open", false);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  // toast.promise 形态（对齐 React 端）：保存全程 loading toast，
  // 完成后原位替换为成功/失败；duration 0 保证请求返回前不消失
  const savingToast = toast.add({
    title: t("features.posts.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    // event.data 已过 schema 校验转换（name/rank 已 trim）
    const input = {
      name: event.data.name,
      deptId: event.data.deptId,
      category: event.data.category,
      rank: event.data.rank,
      status: event.data.status,
    };

    const saved = isEdit.value
      ? await updatePost(props.post!.id, input)
      : await createPost(input);

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.posts.message.updated"
          : "features.posts.message.created",
      ),
      icon: "i-lucide-check",
      color: "success",
    });

    emit("saved", saved, props.mode);
    close();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getPostErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<script lang="ts">
export default { name: "PostFormDialog" };
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :title="
      t(
        isEdit
          ? 'features.posts.form.title.edit'
          : 'features.posts.form.title.create',
      )
    "
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        :id="FORM_ID"
        ref="formRef"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('features.posts.form.dept')"
          name="deptId"
          required
        >
          <DeptTreeSelect
            v-model="state.deptId"
            :placeholder="t('features.org.deptTreeSelect.placeholder')"
            :tree="tree"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('features.posts.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :maxlength="NAME_MAX_LENGTH"
            :placeholder="t('features.posts.form.namePlaceholder')"
            class="w-full"
            :ui="{ base: 'pe-16' }"
          >
            <!-- trailing 实时字数（对齐 React 端 InputGroup.Suffix） -->
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.name.length }}/{{ NAME_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('features.posts.form.category')" name="category">
          <USelect
            v-model="state.category"
            :items="categoryOptions"
            :placeholder="t('features.posts.form.categoryPlaceholder')"
            class="w-full"
            value-key="value"
          />
        </UFormField>

        <UFormField :label="t('features.posts.form.rank')" name="rank">
          <UInput
            v-model="state.rank"
            :maxlength="RANK_MAX_LENGTH"
            :placeholder="t('features.posts.form.rankPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div
          class="border-default flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <span class="text-sm">
            {{ t("features.posts.form.status") }}
          </span>
          <USwitch
            :aria-label="t('features.posts.form.status')"
            :model-value="state.status === 'enabled'"
            unchecked-icon="i-lucide-x"
            checked-icon="i-lucide-check"
            @update:model-value="
              (value: boolean) =>
                (state.status = value ? 'enabled' : 'disabled')
            "
          />
        </div>
      </UForm>
    </template>

    <template #footer="{ close: onClose }">
      <UButton
        color="neutral"
        :label="t('common.cancel')"
        variant="outline"
        @click="onClose"
      />
      <UButton
        :form="FORM_ID"
        :label="
          submitting ? t('features.posts.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>
