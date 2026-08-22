'use client'

import { AlertTriangle } from 'lucide-react'
import { type Role } from '@/lib/api-types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteRole } from '../hooks/use-roles'

type RolesDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: Role
}

export function RolesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: RolesDeleteDialogProps) {
  const deleteRole = useDeleteRole()

  const handleDelete = () => {
    deleteRole.mutate(currentRow.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除角色
        </span>
      }
      desc={
        <>
          <p>
            确定要删除角色 <span className='font-bold'>{currentRow.name}</span>
            （<span className='font-bold'>{currentRow.code}</span>
            ）吗？
            <br />
            删除后该角色的授权关系将一并移除。
          </p>
          <Alert variant='destructive' className='mt-4'>
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>请谨慎操作，此操作无法回滚。</AlertDescription>
          </Alert>
        </>
      }
      confirmText='删除'
      destructive
      handleConfirm={handleDelete}
    />
  )
}
