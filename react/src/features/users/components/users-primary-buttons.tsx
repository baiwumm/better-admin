import { UserPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  const userPermissions = useAuthStore((state) => state.user?.permissions)

  if (!hasPermission(userPermissions, PERMISSIONS.ADD)) return null

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>新增用户</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
