import { createFileRoute } from '@tanstack/react-router'
import { PermissionsPage } from '@/features/permissions'

export const Route = createFileRoute('/_authenticated/permissions/')({
  component: PermissionsPage,
})
