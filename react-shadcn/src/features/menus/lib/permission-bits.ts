import {
  GitBranchPlus,
  ListX,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { type PermissionKey } from '@/lib/permissions'

/** 权限点元数据（与后端 permissions.enum.ts 位值一致） */
export const PERMISSION_OPTIONS: {
  key: PermissionKey
  label: string
  bit: number
  icon: LucideIcon
}[] = [
  { key: 'SEARCH', label: '查询', bit: 1, icon: Search },
  { key: 'ADD', label: '新增', bit: 2, icon: Plus },
  { key: 'EDIT', label: '编辑', bit: 4, icon: PencilLine },
  { key: 'DELETE', label: '删除', bit: 8, icon: Trash2 },
  { key: 'BATCH_DELETE', label: '批量删除', bit: 16, icon: ListX },
  { key: 'ADD_CHILD', label: '新增子级', bit: 32, icon: GitBranchPlus },
  { key: 'RESET', label: '重置', bit: 64, icon: RotateCcw },
  { key: 'SETTINGS_UPDATE', label: '设置更新', bit: 128, icon: Settings },
]

/** 位掩码 → 当前勾选的权限点 */
export function bitsToKeys(bits: number | string): PermissionKey[] {
  const value = BigInt(bits || '0')
  const keys: PermissionKey[] = []
  for (const opt of PERMISSION_OPTIONS) {
    if ((value & BigInt(opt.bit)) !== BigInt(0)) keys.push(opt.key)
  }
  return keys
}

/** 权限点集合 → 位掩码字符串 */
export function keysToBits(keys: PermissionKey[]): string {
  return keys
    .reduce((acc, key) => {
      const opt = PERMISSION_OPTIONS.find((o) => o.key === key)
      return acc | BigInt(opt?.bit ?? 0)
    }, 0n)
    .toString()
}