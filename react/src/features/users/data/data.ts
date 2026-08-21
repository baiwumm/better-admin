import { Shield, UserCheck, Users, CreditCard } from 'lucide-react'
import { type UserStatus } from './schema'

export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  ['invited', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
  [
    'suspended',
    'bg-destructive/10 dark:bg-destructive/50 text-destructive dark:text-primary border-destructive/10',
  ],
])

export const statusLabels = new Map<UserStatus, string>([
  ['active', '启用'],
  ['inactive', '停用'],
  ['invited', '已邀请'],
  ['suspended', '已停用'],
])

export const roles = [
  {
    label: '超级管理员',
    value: 'superadmin',
    icon: Shield,
  },
  {
    label: '管理员',
    value: 'admin',
    icon: UserCheck,
  },
  {
    label: '经理',
    value: 'manager',
    icon: Users,
  },
  {
    label: '收银员',
    value: 'cashier',
    icon: CreditCard,
  },
] as const
