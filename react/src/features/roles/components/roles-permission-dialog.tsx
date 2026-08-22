'use client'

import { useMemo, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { type MenuNode } from '@/lib/api-types'
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { getMenuIcon } from '@/components/layout/data/menu-icon-map'
import { useMenus } from '@/components/layout/hooks/use-menus'
import { useRoleMenus, useUpdateRoleMenus } from '../hooks/use-roles'

const permissionOptions: { key: PermissionKey; label: string }[] = [
  { key: 'SEARCH', label: '查询' },
  { key: 'ADD', label: '新增' },
  { key: 'EDIT', label: '编辑' },
  { key: 'DELETE', label: '删除' },
  { key: 'BATCH_DELETE', label: '批量删除' },
  { key: 'ADD_CHILD', label: '新增子级' },
  { key: 'RESET', label: '重置' },
  { key: 'SETTINGS_UPDATE', label: '设置更新' },
]

const FULL_MASK = BigInt('9223372036854775807')

type RolesPermissionDialogProps = {
  roleId: string
  roleName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RolesPermissionDialog({
  roleId,
  roleName,
  open,
  onOpenChange,
}: RolesPermissionDialogProps) {
  const { data: menuTree, isLoading: menusLoading } = useMenus()
  const { data: roleMenus, isLoading: roleMenusLoading } = useRoleMenus(
    open ? roleId : null
  )
  const updateRoleMenus = useUpdateRoleMenus()
  // 用户在当前对话框中的修改覆盖（服务端初始值见 initialBits）
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 服务端已授权位（role_menus）
  const initialBits = useMemo(() => {
    const next: Record<string, string> = {}
    if (open && roleMenus) {
      for (const item of roleMenus.menus) {
        next[item.menuId] = item.permissions
      }
    }
    return next
  }, [open, roleMenus])

  const totalNodes = useMemo(() => {
    const count = (nodes: MenuNode[]): number =>
      nodes.reduce((acc, node) => acc + 1 + count(node.children ?? []), 0)
    return menuTree ? count(menuTree) : 0
  }, [menuTree])

  const getBits = (menuId: string): string =>
    overrides[menuId] ?? initialBits[menuId] ?? '0'

  const assignableCount = useMemo(() => {
    const allMenuIds = new Set<string>([
      ...Object.keys(initialBits),
      ...Object.keys(overrides),
    ])
    let count = 0
    for (const menuId of allMenuIds) {
      const bits = overrides[menuId] ?? initialBits[menuId] ?? '0'
      if (BigInt(bits) !== BigInt(0)) count += 1
    }
    return count
  }, [initialBits, overrides])

  const hasBit = (bits: string, bit: number): boolean => {
    const value = BigInt(bits)
    return value !== BigInt(0) && (value & BigInt(bit)) !== BigInt(0)
  }

  const togglePermission = (menuId: string, bit: number) => {
    const current = BigInt(getBits(menuId))
    let value = current
    if (value === FULL_MASK) value = BigInt(-1) // 全量掩码按 -1n 计算，便于取反
    let next: bigint
    if ((value & BigInt(bit)) !== BigInt(0)) {
      next = value & ~BigInt(bit)
    } else {
      next = value | BigInt(bit)
    }
    setOverrides((prev) => ({
      ...prev,
      [menuId]: next === BigInt(-1) ? FULL_MASK.toString() : next.toString(),
    }))
  }

  const toggleMaster = (menuId: string, declared: string) => {
    const current = BigInt(getBits(menuId))
    if (current !== BigInt(0)) {
      setOverrides((prev) => ({ ...prev, [menuId]: '0' }))
      return
    }
    // 勾选可见：默认授予该菜单声明的全部按钮位；未声明按钮位的菜单至少赋 SEARCH(1)
    const next = BigInt(declared) === BigInt(0) ? '1' : declared
    setOverrides((prev) => ({ ...prev, [menuId]: next }))
  }

  const save = async () => {
    const allMenuIds = new Set<string>([
      ...Object.keys(initialBits),
      ...Object.keys(overrides),
    ])
    const menus = [...allMenuIds]
      .map((menuId) => ({ menuId, permissions: getBits(menuId) }))
      .filter((item) => BigInt(item.permissions) !== BigInt(0))
    setIsSaving(true)
    try {
      await updateRoleMenus.mutateAsync({ roleId, menus })
      onOpenChange(false)
    } catch {
      // 错误已由 hook onError 提示
    } finally {
      setIsSaving(false)
    }
  }

  const renderTree = (nodes: MenuNode[], depth: number) => {
    return nodes.map((node) => {
      const bits = getBits(node.id)
      const hasChildren = (node.children ?? []).length > 0
      return (
        <div key={node.id}>
          <div
            className='flex items-center gap-3 py-2'
            style={{ paddingLeft: `${depth * 24}px` }}
          >
            <Checkbox
              checked={BigInt(bits) !== BigInt(0)}
              onCheckedChange={() => toggleMaster(node.id, node.permissions)}
              aria-label={`${node.label} 可见`}
            />
            <span className='text-muted-foreground'>
              {(() => {
                const Icon = getMenuIcon(node.icon)
                return <Icon className='size-4' />
              })()}
            </span>
            <span className='min-w-28 text-sm font-medium'>{node.label}</span>
            <span className='hidden text-xs text-muted-foreground sm:block'>
              {node.to || '（目录）'}
            </span>
            <div className='ms-auto flex flex-wrap items-center gap-x-3 gap-y-1'>
              {permissionOptions.map(({ key, label }) => (
                <label
                  key={key}
                  className='flex cursor-pointer items-center gap-1 text-xs text-muted-foreground'
                >
                  <Checkbox
                    checked={hasBit(bits, PERMISSIONS[key])}
                    onCheckedChange={() =>
                      togglePermission(node.id, PERMISSIONS[key])
                    }
                    aria-label={`${node.label} ${label}`}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {hasChildren && renderTree(node.children ?? [], depth + 1)}
        </div>
      )
    })
  }

  const loading = menusLoading || roleMenusLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            <KeyRound className='me-1 inline-block size-5 align-text-top' />
            角色授权 — {roleName}
          </DialogTitle>
          <DialogDescription>
            为角色分配菜单访问权与按钮权限（已勾选 {assignableCount}/
            {totalNodes} 项菜单）。
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-105 overflow-y-auto pe-2'>
          {loading ? (
            <div className='flex h-40 items-center justify-center gap-2 text-muted-foreground'>
              <Loader2 className='size-5 animate-spin' /> 加载菜单…
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'flex items-center gap-3 border-b pb-2 text-xs text-muted-foreground',
                  'sticky top-0 z-10 bg-background'
                )}
              >
                <span className='w-4' />
                <span className='w-4' />
                <span className='min-w-28'>菜单</span>
                <span className='ms-auto flex items-center gap-x-3'>
                  {permissionOptions.map(({ label }) => (
                    <span key={label} className='w-16 text-center'>
                      {label}
                    </span>
                  ))}
                </span>
              </div>
              <Separator />
              {menuTree?.length ? (
                renderTree(menuTree, 0)
              ) : (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  暂无菜单数据
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={save} disabled={loading || isSaving}>
            {isSaving ? <Loader2 className='animate-spin' /> : null} 保存授权
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
