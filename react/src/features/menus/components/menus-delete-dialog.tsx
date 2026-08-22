'use client'

import { AlertTriangle } from 'lucide-react'
import { type MenuNode } from '@/lib/api-types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useDeleteMenu } from '../hooks/use-menu-mutations'

type MenusDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: MenuNode
}

export function MenusDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: MenusDeleteDialogProps) {
  const deleteMenu = useDeleteMenu()

  const hasChildren = (currentRow.children ?? []).length > 0

  const handleDelete = () => {
    deleteMenu.mutate(currentRow.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      disabled={hasChildren}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          删除菜单
        </span>
      }
      desc={
        <>
          <p>
            确定要删除菜单 <span className='font-bold'>{currentRow.label}</span>{' '}
            吗？
          </p>
          {hasChildren ? (
            <Alert variant='destructive' className='mt-4'>
              <AlertTitle>无法删除</AlertTitle>
              <AlertDescription>
                该菜单包含 {currentRow.children?.length}{' '}
                个子菜单。系统不允许直接删除含子菜单的菜单，请先删除其全部子菜单后再操作。
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant='destructive' className='mt-4'>
              <AlertTitle>警告</AlertTitle>
              <AlertDescription>请谨慎操作，此操作无法回滚。</AlertDescription>
            </Alert>
          )}
        </>
      }
      confirmText='删除'
      destructive
      handleConfirm={handleDelete}
    />
  )
}
