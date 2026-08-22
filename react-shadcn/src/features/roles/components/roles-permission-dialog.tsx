'use client'

import { useMemo, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { type MenuNode } from '@/lib/api-types'
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
import { PermissionBitsField } from '@/features/menus/components/permission-bits-field'
import { bitsToKeys } from '@/features/menus/lib/permission-bits'
import { useRoleMenus, useUpdateRoleMenus } from '../hooks/use-roles'

type RolesPermissionDialogProps = {
  roleId: string
  roleName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 角色授权弹窗（父子级关联，Antd Tree 风格）。
 *
 * 语义（已与业务对齐）：
 * - 可见性勾选 = role_menus 中「该菜单有记录」（无论 permissions 是否为 0）。
 * - 按钮位 = 记录的 permissions 值；按菜单声明位（menu.permissions）渲染，
 *   菜单声明位为 0（父/目录）时该行不渲染按钮区。
 * - 父子联动：勾选父级 → 自动勾选全部子孙；部分子级勾选 → 父级半选（indeterminate）。
 * - 保存：全量替换 role_menus；permissions=0 的记录也保留（代表可见但无按钮）。
 */
export function RolesPermissionDialog({
  roleId,
  roleName,
  open,
  onOpenChange,
}: RolesPermissionDialogProps) {
  const { data: menuTree, isLoading: menusLoading } = useMenus()
  const { data: roleMenus, isLoading: roleMenusLoading, refetch } = useRoleMenus(
    open ? roleId : null
  )
  const updateRoleMenus = useUpdateRoleMenus()
  const [isSaving, setIsSaving] = useState(false)

  // 服务端已授权集合（menuId → permissions 位）。「有记录」= 可见。
  const initialAuth = useMemo(() => {
    const next: Record<string, string> = {}
    if (open && roleMenus) {
      for (const item of roleMenus.menus) {
        next[item.menuId] = item.permissions
      }
    }
    return next
  }, [open, roleMenus])

  // 本地修改：可见性 = Record<menuId, boolean>；按钮位 = Record<menuId, string>
  const [visibleOverrides, setVisibleOverrides] = useState<
    Record<string, boolean>
  >({})
  const [bitsOverrides, setBitsOverrides] = useState<Record<string, string>>({})

  // 打开弹窗时重置本地修改
  const resetLocal = () => {
    setVisibleOverrides({})
    setBitsOverrides({})
  }

  const isVisible = (menuId: string): boolean =>
    visibleOverrides[menuId] ?? initialAuth[menuId] !== undefined

  const getBits = (menuId: string): string =>
    bitsOverrides[menuId] ?? initialAuth[menuId] ?? '0'

  const setVisible = (menuId: string, visible: boolean) => {
    setVisibleOverrides((prev) => ({ ...prev, [menuId]: visible }))
  }

  const setBits = (menuId: string, bits: string) => {
    setBitsOverrides((prev) => ({ ...prev, [menuId]: bits }))
  }

  /**
   * 递归设置节点及其全部子孙的可见性（父子联动：勾父 → 全子）。
   */
  const setSubtreeVisible = (node: MenuNode, visible: boolean) => {
    setVisible(node.id, visible)
    for (const child of node.children ?? []) {
      setSubtreeVisible(child, visible)
    }
  }

  /** 选中节点数（含半选合并：仅用于统计展示） */
  const selectedCount = useMemo(() => {
    let count = 0
    const walk = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        const visible =
          visibleOverrides[node.id] ?? initialAuth[node.id] !== undefined
        if (visible) count += 1
        walk(node.children ?? [])
      }
    }
    walk(menuTree ?? [])
    return count
  }, [menuTree, visibleOverrides, initialAuth])

  /** 节点勾选状态：'checked' | 'indeterminate' | 'unchecked' */
  const checkState = (node: MenuNode): 'checked' | 'indeterminate' | 'unchecked' => {
    const children = node.children ?? []
    if (children.length === 0) {
      return isVisible(node.id) ? 'checked' : 'unchecked'
    }
    const childStates = children.map(checkState)
    const allChecked = childStates.every((s) => s === 'checked')
    const anyChecked = childStates.some((s) => s !== 'unchecked')
    if (allChecked) return 'checked'
    if (anyChecked) return 'indeterminate'
    return 'unchecked'
  }

  /**
   * 主勾选（可见性）切换。
   * - 勾选：节点可见 + 若按钮区存在则默认授权其声明位（0 声明位 → 0）。
   * - 父子联动：勾选父级 → 全子树可见。
   * - 取消：节点不可见（子级保持独立判断，联动由 checkState 半选推导）。
   */
  const toggleMaster = (node: MenuNode) => {
    const state = checkState(node)
    const next = state !== 'checked' // indeterminate 或 unchecked → 勾选
    setSubtreeVisible(node, next)
    if (next) {
      // 勾选可见：默认授权该菜单声明的全部位；声明位为 0 则授权 0（可见无按钮）
      setBits(node.id, node.permissions || '0')
    }
  }

  const save = async () => {
    const allMenuIds = new Set<string>([
      ...Object.keys(initialAuth),
      ...Object.keys(visibleOverrides),
    ])
    const menus: { menuId: string; permissions: string }[] = []
    for (const menuId of allMenuIds) {
      if (isVisible(menuId)) {
        menus.push({ menuId, permissions: getBits(menuId) })
      }
    }
    setIsSaving(true)
    try {
      await updateRoleMenus.mutateAsync({ roleId, menus })
      await refetch()
      onOpenChange(false)
    } catch {
      // 错误已由 hook onError 提示
    } finally {
      setIsSaving(false)
    }
  }

  const renderTree = (nodes: MenuNode[], depth: number) => {
    return nodes.map((node) => {
      const children = node.children ?? []
      const hasChildren = children.length > 0
      const state = checkState(node)
      const declaredKeys = bitsToKeys(node.permissions || '0')
      const hasButtons = declaredKeys.length > 0

      return (
        <div key={node.id}>
          <div
            className='flex items-center gap-3 py-2'
            style={{ paddingLeft: `${depth * 24}px` }}
          >
            <Checkbox
              checked={state === 'checked' ? true : state === 'indeterminate' ? 'indeterminate' : false}

              onCheckedChange={() => toggleMaster(node)}
              aria-label={`${node.label} 可见`}
            />
            <span className='text-muted-foreground'>
              {(() => {
                const Icon = getMenuIcon(node.icon)
                return <Icon className='size-4' />
              })()}
            </span>
            <span className='min-w-24 text-sm font-medium'>{node.label}</span>
            <span className='hidden text-xs text-muted-foreground sm:block'>
              {node.to || '（目录）'}
            </span>
            {/* 叶子 + 有声明位 → 渲染按钮区；否则仅节点 */}
            {!hasChildren && hasButtons && (
              <div className='ms-auto'>
                <PermissionBitsField
                  value={getBits(node.id)}
                  enabledKeys={declaredKeys}
                  compact
                  onChange={(bits) => {
                    setBits(node.id, bits)
                  }}
                />
              </div>
            )}
          </div>
          {hasChildren && renderTree(children, depth + 1)}
        </div>
      )
    })
  }

  const totalNodes = useMemo(() => {
    const count = (nodes: MenuNode[]): number =>
      nodes.reduce((acc, node) => acc + 1 + count(node.children ?? []), 0)
    return menuTree ? count(menuTree) : 0
  }, [menuTree])

  const loading = menusLoading || roleMenusLoading

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetLocal()
        onOpenChange(next)
      }}
    >
      <DialogContent className='max-w-3xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            <KeyRound className='me-1 inline-block size-5 align-text-top' />
            角色授权 — {roleName}
          </DialogTitle>
          <DialogDescription>
            勾选父级将自动勾选全部子菜单；部分子级选中时父级呈半选状态。已勾选{' '}
            {selectedCount}/{totalNodes} 项菜单。
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
                <span className='min-w-24'>菜单</span>
                <span className='ms-auto'>按钮权限（按菜单声明位）</span>
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
          <Button variant='outline' onClick={() => { resetLocal(); onOpenChange(false) }}>
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