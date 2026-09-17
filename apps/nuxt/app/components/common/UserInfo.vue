<script setup lang="ts">
import { computed } from 'vue'

/**
 * 用户信息合并展示（头像 + 显示名 + 用户名/邮箱），列表与选择器共用。
 * 入参用结构化最小接口而非 Pick<User>：通讯录 DirectoryEntry 等条目的
 * email/avatar 可空，同样满足展示需求。
 * 副行与主行相同或为空时不渲染（对齐 React 端 UserInfo）：如组织负责人
 * 摘要仅有姓名与头像，username 复用姓名传入即只显示头像 + 姓名。
 */
const props = withDefaults(
  defineProps<{
    user: {
      avatar: string | null
      displayName: string
      username: string
      email: string | null
    }
    /** 副行内容：username（默认）或 email */
    sub?: 'username' | 'email'
  }>(),
  { sub: 'username' }
)

const name = computed(() => props.user.displayName || props.user.username)
const initials = computed(() => name.value.slice(0, 1).toUpperCase())
const subText = computed(() => {
  const sub
    = props.sub === 'email'
      ? props.user.email
      : props.user.username || props.user.email

  return sub && sub !== name.value ? sub : null
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <UAvatar
      :alt="name"
      :src="user.avatar ?? undefined"
      :text="initials"
      size="sm"
    />
    <div class="min-w-0 leading-tight">
      <div class="truncate text-sm font-medium">
        {{ name }}
      </div>
      <div
        v-if="subText"
        class="text-muted truncate text-xs"
      >
        {{ subText }}
      </div>
    </div>
  </div>
</template>
