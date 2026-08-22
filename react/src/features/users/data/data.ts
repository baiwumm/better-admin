import { type UserStatus } from './schema'

/** 状态徽标样式 */
export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['disabled', 'bg-destructive/10 text-destructive border-destructive/10'],
])

export const statusLabels = new Map<UserStatus, string>([
  ['active', '启用'],
  ['disabled', '停用'],
])

export const statusOptions: { label: string; value: UserStatus }[] = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
]
