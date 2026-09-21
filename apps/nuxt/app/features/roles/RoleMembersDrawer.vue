<script setup lang="ts">
import type { DirectoryEntry, Role } from '@/lib/api-types'

import { computed, ref, watch } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'

import { fetchRoleUsers } from './role-api'

import Spinner from '@/components/ui/spinner/index.vue'

/**
 * 角色关联用户抽屉（关联用户穿透，契约 v1.13.0 GET /roles/:id/users，
 * 对应 React 端 role-members-drawer.tsx）：点击角色列表「关联用户」列 +N
 * 打开，服务端分页展示关联用户（仅在职且未删除用户）。
 * 总数固定在标题副文案、分页固定在 footer，名单滚动时两者不随动。
 */
const props = defineProps<{
  open: boolean
  /** 穿透目标角色（关闭后置 null） */
  role: Role | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()

/** 名单分页大小（pageSize 全站枚举 10/20/30/40/50），与岗位在职人员抽屉一致 */
const MEMBERS_PAGE_SIZE = 20

const page = ref(1)

// 关闭即回到第一页：下次打开（含同一角色）都从头看名单
watch(
  () => props.open,
  (open) => {
    if (!open) page.value = 1
  }
)

const membersQuery = useQuery({
  queryKey: computed(() => [
    'roles',
    'users',
    props.role?.id ?? '',
    page.value
  ]),
  queryFn: () => fetchRoleUsers(props.role!.id, page.value, MEMBERS_PAGE_SIZE),
  enabled: computed(() => props.open && Boolean(props.role)),
  placeholderData: keepPreviousData,
  staleTime: 0
})

const members = computed<DirectoryEntry[]>(
  () => membersQuery.data.value?.data ?? []
)
const total = computed(() => membersQuery.data.value?.pagination.total ?? 0)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / MEMBERS_PAGE_SIZE))
)
// 翻页期间 keepPreviousData 持续显示旧页数据：降透明 + 叠加 Spinner 给出反馈
const switching = computed(() => membersQuery.isPlaceholderData.value)

const title = computed(() =>
  props.role
    ? t('features.roles.members.title', { name: props.role.name })
    : t('features.roles.members.titleFallback')
)
// 总数固定在头部副文案：加载完成且非空才显示（与 React 端一致）
const countText = computed(() =>
  membersQuery.isSuccess.value && members.value.length > 0
    ? t('features.roles.members.count', { count: total.value })
    : undefined
)

function close() {
  emit('update:open', false)
}
</script>

<script lang="ts">
export default { name: 'RoleMembersDrawer' }
</script>

<template>
  <USlideover
    :open="open"
    :ui="{ content: 'w-105 max-w-[85vw]' }"
    :title="title"
    :description="countText"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <div
        v-if="membersQuery.isLoading.value"
        class="grid place-items-center py-10"
      >
        <Spinner size="md" />
      </div>
      <p
        v-else-if="membersQuery.isError.value"
        class="text-muted text-sm"
      >
        {{ t("features.roles.members.loadFailed") }}
      </p>
      <p
        v-else-if="members.length === 0"
        class="text-muted py-6 text-center text-sm"
      >
        {{ t("features.roles.members.empty") }}
      </p>
      <div
        v-else
        class="relative flex flex-col gap-2 transition-opacity data-[loading=true]:pointer-events-none data-[loading=true]:opacity-40"
        :data-loading="switching ? 'true' : undefined"
      >
        <div
          v-for="entry in members"
          :key="entry.id"
          class="border-default flex items-center gap-3 rounded-xl border px-3 py-2"
        >
          <UAvatar
            :alt="entry.displayName"
            :src="entry.avatar ?? undefined"
            :text="entry.displayName.slice(0, 1)"
            class="shrink-0"
            size="sm"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ entry.displayName }}
            </p>
            <p class="text-muted truncate text-xs">
              {{ entry.deptPath ?? entry.username }}
            </p>
          </div>
        </div>
        <div
          v-if="switching"
          class="absolute inset-0 grid place-items-center"
        >
          <Spinner size="sm" />
        </div>
      </div>
    </template>

    <template
      v-if="totalPages > 1"
      #footer
    >
      <div class="flex w-full justify-center">
        <UPagination
          :page="page"
          :total="total"
          :items-per-page="MEMBERS_PAGE_SIZE"
          :sibling-count="1"
          size="sm"
          @update:page="(value: number) => (page = value)"
        />
      </div>
    </template>
  </USlideover>
</template>
