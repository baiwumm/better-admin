'use client'

import { CheckCircle2, Power } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { type User } from '../data/schema'
import { useUpdateUserStatus } from '../hooks/use-users'

type UsersToggleStatusDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersToggleStatusDialog({
  open,
  onOpenChange,
  currentRow,
}: UsersToggleStatusDialogProps) {
  const updateUserStatus = useUpdateUserStatus()
  const nextStatus: 'active' | 'disabled' =
    currentRow.status === 'active' ? 'disabled' : 'active'

  const handleToggle = () => {
    updateUserStatus.mutate(
      { id: currentRow.id, status: nextStatus },
      {
        onSuccess: () => onOpenChange(false),
      }
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span>
          {currentRow.status === 'active' ? (
            <Power className='me-1 inline-block stroke-destructive' size={18} />
          ) : (
            <CheckCircle2
              className='me-1 inline-block text-teal-600'
              size={18}
            />
          )}
          {currentRow.status === 'active' ? '停用用户' : '启用用户'}
        </span>
      }
      desc={
        <p>
          确定要
          <span className='font-bold'>
            {currentRow.status === 'active' ? '停用' : '启用'}
          </span>
          用户 <span className='font-bold'>{currentRow.username}</span> 吗？
          {currentRow.status === 'active'
            ? '停用后该用户将无法登录系统。'
            : '启用后该用户可重新登录系统。'}
        </p>
      }
      confirmText={currentRow.status === 'active' ? '停用' : '启用'}
      destructive={currentRow.status === 'active'}
      handleConfirm={handleToggle}
    />
  )
}
