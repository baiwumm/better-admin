import { UsersActionDialog } from './users-action-dialog'
import { UsersDeleteDialog } from './users-delete-dialog'
import { useUsers } from './users-provider'
import { UsersResetPasswordDialog } from './users-reset-password-dialog'
import { UsersToggleStatusDialog } from './users-toggle-status-dialog'

export function UsersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useUsers()

  const closeRowDialog = () => {
    setOpen(null)
    setCurrentRow(null)
  }

  return (
    <>
      <UsersActionDialog
        key='user-add'
        open={open === 'add'}
        onOpenChange={(nextOpen) => setOpen(nextOpen ? 'add' : null)}
      />

      {currentRow && (
        <>
          <UsersActionDialog
            key={`user-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) closeRowDialog()
            }}
            currentRow={currentRow}
          />

          <UsersDeleteDialog
            key={`user-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) closeRowDialog()
            }}
            currentRow={currentRow}
          />

          <UsersResetPasswordDialog
            key={`user-reset-${currentRow.id}`}
            open={open === 'reset-password'}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) closeRowDialog()
            }}
            currentRow={currentRow}
          />

          <UsersToggleStatusDialog
            key={`user-toggle-${currentRow.id}`}
            open={open === 'toggle-status'}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) closeRowDialog()
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
