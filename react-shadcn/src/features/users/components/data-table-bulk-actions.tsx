import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { useBatchUpdateUserStatus } from '../hooks/use-users'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const userPermissions = useAuthStore((state) => state.user?.permissions)
  const batchUpdateUserStatus = useBatchUpdateUserStatus()

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedUsers = selectedRows.map((row) => row.original as User)
  const canEdit = hasPermission(userPermissions, PERMISSIONS.EDIT)
  const canBatchDelete = hasPermission(
    userPermissions,
    PERMISSIONS.BATCH_DELETE
  )

  const handleBulkStatusChange = (status: 'active' | 'disabled') => {
    const items = selectedUsers.map((user) => ({ id: user.id, status }))
    batchUpdateUserStatus.mutate(items, {
      onSuccess: () => {
        table.resetRowSelection()
      },
    })
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='user'>
        {canEdit && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handleBulkStatusChange('active')}
                  className='size-8'
                  aria-label='启用选中用户'
                  title='启用选中用户'
                >
                  <UserCheck />
                  <span className='sr-only'>启用选中用户</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>启用选中用户</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => handleBulkStatusChange('disabled')}
                  className='size-8'
                  aria-label='停用选中用户'
                  title='停用选中用户'
                >
                  <UserX />
                  <span className='sr-only'>停用选中用户</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>停用选中用户</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {canBatchDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='destructive'
                size='icon'
                onClick={() => setShowDeleteConfirm(true)}
                className='size-8'
                aria-label='删除选中用户'
                title='删除选中用户'
              >
                <Trash2 />
                <span className='sr-only'>删除选中用户</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>删除选中用户</p>
            </TooltipContent>
          </Tooltip>
        )}
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
