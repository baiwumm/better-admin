import { useMemo, useState } from 'react'
import {
  GitBranchPlus,
  Menu as MenuIcon,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type MenuNode } from '@/lib/api-types'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMenuIcon } from '@/components/layout/data/menu-icon-map'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { MenusActionDialog } from './components/menus-action-dialog'
import { MenusAddChildDialog } from './components/menus-add-child-dialog'
import { MenusDeleteDialog } from './components/menus-delete-dialog'
import { useMenus } from './hooks/use-menu-mutations'

type DialogType = 'edit' | 'delete' | 'add-child' | null

interface RowNode extends MenuNode {
  depth: number
}

function flattenTree(nodes: MenuNode[], depth = 0): RowNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ])
}

export function MenusPage() {
  const { data: menuTree, isLoading } = useMenus()
  const [dialog, setDialog] = useState<DialogType>(null)
  const [currentRow, setCurrentRow] = useState<MenuNode | null>(null)
  const userPermissions = useAuthStore((state) => state.user?.permissions)

  const canAdd = hasPermission(userPermissions, PERMISSIONS.ADD)
  const canAddChild = hasPermission(userPermissions, PERMISSIONS.ADD_CHILD)
  const canEdit = hasPermission(userPermissions, PERMISSIONS.EDIT)
  const canDelete = hasPermission(userPermissions, PERMISSIONS.DELETE)

  const rows = useMemo(
    () => (menuTree ? flattenTree(menuTree) : []),
    [menuTree]
  )

  return (
    <>
      <Header fixed>
        <HeaderActions />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>菜单管理</h2>
            <p className='text-muted-foreground'>
              维护系统菜单树结构，支持新增子级与按钮权限位配置。
            </p>
          </div>
          {canAdd && (
            <Button className='space-x-1' onClick={() => setDialog('edit')}>
              <span>新增菜单</span> <Plus size={18} />
            </Button>
          )}
        </div>

        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='group/row'>
                <TableHead>菜单名称</TableHead>
                <TableHead>路由地址</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>隐藏</TableHead>
                <TableHead>按钮权限位</TableHead>
                <TableHead className='w-40 text-end'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    加载中...
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row) => {
                  const Icon = getMenuIcon(row.icon)
                  return (
                    <TableRow key={row.id} className='group/row'>
                      <TableCell className='font-medium'>
                        <span
                          className='inline-flex items-center gap-2'
                          style={{ paddingLeft: `${row.depth * 24}px` }}
                        >
                          <span className='text-muted-foreground'>
                            <Icon className='size-4' />
                          </span>
                          <span>{row.label}</span>
                          {row.depth > 0 && (
                            <Badge variant='outline' className='text-xs'>
                              子级
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className='font-mono text-xs text-muted-foreground'>
                        {row.to || '—'}
                      </TableCell>
                      <TableCell>{row.sort}</TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={
                            row.enabled
                              ? 'border-teal-200 bg-teal-100/30 text-teal-900 dark:text-teal-200'
                              : 'border-neutral-300 bg-neutral-300/40'
                          }
                        >
                          {row.enabled ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.hideInMenu ? (
                          <Badge variant='outline'>隐藏</Badge>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='font-mono text-xs'>
                        {row.permissions}
                      </TableCell>
                      <TableCell className='text-end'>
                        <div className='flex justify-end gap-1'>
                          {canAddChild && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8'
                              title='新增子级'
                              onClick={() => {
                                setCurrentRow(row)
                                setDialog('add-child')
                              }}
                            >
                              <GitBranchPlus className='size-4' />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8'
                              title='编辑'
                              onClick={() => {
                                setCurrentRow(row)
                                setDialog('edit')
                              }}
                            >
                              <PencilLine className='size-4' />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 text-red-500!'
                              title='删除'
                              onClick={() => {
                                setCurrentRow(row)
                                setDialog('delete')
                              }}
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                      <MenuIcon className='size-8' />
                      暂无菜单数据
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Main>

      <MenusActionDialog
        open={dialog === 'edit' && !currentRow}
        onOpenChange={(open) => setDialog(open ? 'edit' : null)}
      />

      {currentRow && (
        <>
          <MenusActionDialog
            key={`menu-edit-${currentRow.id}`}
            open={dialog === 'edit' && !!currentRow}
            onOpenChange={(open) => {
              setDialog(open ? 'edit' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <MenusAddChildDialog
            key={`menu-child-${currentRow.id}`}
            open={dialog === 'add-child'}
            onOpenChange={(open) => {
              setDialog(open ? 'add-child' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            parentRow={currentRow}
          />
          <MenusDeleteDialog
            key={`menu-delete-${currentRow.id}`}
            open={dialog === 'delete'}
            onOpenChange={(open) => {
              setDialog(open ? 'delete' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
