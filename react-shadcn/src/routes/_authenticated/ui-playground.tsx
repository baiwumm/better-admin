import { createFileRoute } from '@tanstack/react-router'
import { UiPlaygroundPage } from '@/features/ui-playground/ui-playground'

export const Route = createFileRoute('/_authenticated/ui-playground')({
  component: UiPlaygroundPage,
})
