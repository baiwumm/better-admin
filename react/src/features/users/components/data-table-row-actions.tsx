import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { type Row } from '@tanstack/react-table'
import { Ban, KeyRound, Trash2, UserCheck, UserPen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'

type DataTableRowActionsProps = {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()
  const userPermissions = useAuthStore((state) => state.user?.permissions)
  const user = row.original

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {hasPermission(userPermissions, PERMISSIONS.EDIT) && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('edit')
            }}
          >
            编辑
            <DropdownMenuShortcut>
              <UserPen size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        {hasPermission(userPermissions, PERMISSIONS.RESET) && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('reset-password')
            }}
          >
            重置密码
            <DropdownMenuShortcut>
              <KeyRound size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        {hasPermission(userPermissions, PERMISSIONS.EDIT) && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('toggle-status')
            }}
          >
            {user.status === 'active' ? '停用用户' : '启用用户'}
            <DropdownMenuShortcut>
              {user.status === 'active' ? (
                <Ban size={16} />
              ) : (
                <UserCheck size={16} />
              )}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        {hasPermission(userPermissions, PERMISSIONS.DELETE) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(user)
                setOpen('delete')
              }}
              className='text-red-500!'
            >
              删除
              <DropdownMenuShortcut>
                <Trash2 size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
