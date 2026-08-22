import { createFileRoute } from '@tanstack/react-router'
import { SystemSettings } from '@/features/settings/system/system-settings'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SystemSettings,
})
