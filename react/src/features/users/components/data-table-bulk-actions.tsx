import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Trash2, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: `正在${status === 'active' ? '启用' : '停用'}用户...`,
      success: () => {
        table.resetRowSelection()
        return `已${status === 'active' ? '启用' : '停用'} ${selectedUsers.length} 个用户`
      },
      error: `${status === 'active' ? '启用' : '停用'}用户失败`,
    })
    table.resetRowSelection()
  }

  const handleBulkInvite = () => {
    const selectedUsers = selectedRows.map((row) => row.original as User)
    toast.promise(sleep(2000), {
      loading: '正在邀请用户...',
      success: () => {
        table.resetRowSelection()
        return `已邀请 ${selectedUsers.length} 个用户`
      },
      error: '邀请用户失败',
    })
    table.resetRowSelection()
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='user'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkInvite}
              className='size-8'
              aria-label='邀请选中用户'
              title='邀请选中用户'
            >
              <Mail />
              <span className='sr-only'>邀请选中用户</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>邀请选中用户</p>
          </TooltipContent>
        </Tooltip>

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
              onClick={() => handleBulkStatusChange('inactive')}
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
      </BulkActionsToolbar>

      <UsersMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
