<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 确认弹窗（对齐 React 端 ConfirmDialog 语义）：
 * - destructive：危险操作红色样式；
 * - confirmKeyword：输入指定关键词后才允许确认（删除用户名 / 批量 DELETE）；
 * - loading：外部 pending 状态（如父组件自身发起请求）；
 * - 关闭时机由父组件控制：确认仅 emit confirm；成功后父组件置 open=false，
 *   失败保持打开（页面层负责失败 toast）——对齐 React「抛错保持打开」约定。
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    /** 支持插值后的完整文案 */
    description: string | null
    confirmText: string
    destructive?: boolean
    /** 需要输入该关键词才能确认；缺省无关键词门槛 */
    confirmKeyword?: string
    keywordLabel?: string
    /** 外部 pending 状态 */
    loading?: boolean
  }>(),
  {
    destructive: false,
    confirmKeyword: undefined,
    keywordLabel: undefined,
    loading: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const { t } = useI18n()

const keywordInput = ref('')
const isPending = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) keywordInput.value = ''
  }
)

const keywordOk = computed(
  () => !props.confirmKeyword || keywordInput.value === props.confirmKeyword
)

const busy = computed(() => isPending.value || props.loading)

function close() {
  emit('update:open', false)
}

async function handleConfirm() {
  if (!keywordOk.value || busy.value) return
  isPending.value = true
  try {
    emit('confirm')
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :title="title"
    :ui="{ content: 'max-w-md', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <p class="text-muted text-sm whitespace-pre-line">
        {{ description }}
      </p>

      <UFormField
        v-if="confirmKeyword"
        :label="keywordLabel"
        class="mt-3"
      >
        <UInput
          v-model="keywordInput"
          :placeholder="confirmKeyword"
          class="w-full"
          autocomplete="off"
        />
      </UFormField>
    </template>

    <template #footer="{ close: onClose }">
      <UButton
        :disabled="busy"
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="onClose"
      />
      <UButton
        :color="destructive ? 'error' : 'primary'"
        :disabled="!keywordOk || busy"
        :loading="busy || undefined"
        :label="confirmText"
        @click="handleConfirm"
      />
    </template>
  </UModal>
</template>
