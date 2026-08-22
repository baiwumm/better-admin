import { useState } from 'react'
import { KeyRound, PencilLine, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type Role } from '@/lib/api-types'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { RolesActionDialog } from './components/roles-action-dialog'
import { RolesDeleteDialog } from './components/roles-delete-dialog'
import { RolesPermissionDialog } from './components/roles-permission-dialog'
import { useRoles } from './hooks/use-roles'

type DialogType = 'add' | 'edit' | 'delete' | 'permission' | null

export function RolesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dialog, setDialog] = useState<DialogType>(null)
  const [currentRow, setCurrentRow] = useState<Role | null>(null)
  const userPermissions = useAuthStore((state) => state.user?.permissions)

  const canAdd = hasPermission(userPermissions, PERMISSIONS.ADD)
  const canEdit = hasPermission(userPermissions, PERMISSIONS.EDIT)
  const canDelete = hasPermission(userPermissions, PERMISSIONS.DELETE)

  const { data, isLoading } = useRoles({
    page,
    pageSize,
    search: search || undefined,
  })

  const totalPages = Math.max(
    1,
    Math.ceil((data?.pagination.total ?? 0) / pageSize)
  )

  const applySearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <>
      <Header fixed>
        <HeaderActions />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>角色管理</h2>
            <p className='text-muted-foreground'>
              管理角色列表并为角色分配菜单与按钮权限。
            </p>
          </div>
          {canAdd && (
            <Button className='space-x-1' onClick={() => setDialog('add')}>
              <span>新增角色</span> <Plus size={18} />
            </Button>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <Input
            placeholder='搜索角色名称 / 编码...'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch()
            }}
            className='h-9 w-72'
          />
          <Button variant='outline' className='h-9' onClick={applySearch}>
            搜索
          </Button>
        </div>

        <div className='overflow-hidden rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow className='group/row'>
                <TableHead>角色名称</TableHead>
                <TableHead>编码</TableHead>
                <TableHead className='max-w-64'>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>创建时间</TableHead>
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
              ) : data?.data.length ? (
                data.data.map((role) => (
                  <TableRow key={role.id} className='group/row'>
                    <TableCell className='font-medium'>
                      <span className='me-2 inline-flex text-muted-foreground'>
                        <ShieldCheck className='size-4' />
                      </span>
                      {role.name}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {role.code}
                    </TableCell>
                    <TableCell className='max-w-64 truncate text-muted-foreground'>
                      {role.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          role.enabled
                            ? 'border-teal-200 bg-teal-100/30 text-teal-900 dark:text-teal-200'
                            : 'border-neutral-300 bg-neutral-300/40'
                        }
                      >
                        {role.enabled ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.sort}</TableCell>
                    <TableCell className='whitespace-nowrap text-muted-foreground'>
                      {new Date(role.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className='text-end'>
                      <div className='flex justify-end gap-1'>
                        {canEdit && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            title='权限配置'
                            onClick={() => {
                              setCurrentRow(role)
                              setDialog('permission')
                            }}
                          >
                            <KeyRound className='size-4' />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            title='编辑'
                            onClick={() => {
                              setCurrentRow(role)
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
                              setCurrentRow(role)
                              setDialog('delete')
                            }}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center'>
                    未找到结果
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className='mt-auto flex items-center justify-between'>
          <p className='text-sm text-muted-foreground'>
            共 {data?.pagination.total ?? 0} 条记录
          </p>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className='text-sm'>
              {page} / {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
            </Button>
            <select
              className='h-8 rounded-md border bg-background px-2 text-sm'
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[10, 20, 30, 40, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / 页
                </option>
              ))}
            </select>
          </div>
        </div>
      </Main>

      <RolesActionDialog
        open={dialog === 'add'}
        onOpenChange={(open) => setDialog(open ? 'add' : null)}
      />

      {currentRow && (
        <>
          <RolesActionDialog
            key={`role-edit-${currentRow.id}`}
            open={dialog === 'edit'}
            onOpenChange={(open) => {
              setDialog(open ? 'edit' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <RolesDeleteDialog
            key={`role-delete-${currentRow.id}`}
            open={dialog === 'delete'}
            onOpenChange={(open) => {
              setDialog(open ? 'delete' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <RolesPermissionDialog
            key={`role-permission-${currentRow.id}`}
            open={dialog === 'permission'}
            onOpenChange={(open) => {
              setDialog(open ? 'permission' : null)
              if (!open) setTimeout(() => setCurrentRow(null), 500)
            }}
            roleId={currentRow.id}
            roleName={currentRow.name}
          />
        </>
      )}
    </>
  )
}
