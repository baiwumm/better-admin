import { type LucideIcon, Construction } from 'lucide-react'
import { cn } from '@/lib/utils'

type PagePlaceholderProps = {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

/**
 * 页面占位组件：用于尚未进入实现阶段的业务页面（Phase 1B 页面规划）。
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon = Construction,
  className,
}: PagePlaceholderProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center',
        className
      )}
    >
      <div className='flex size-16 items-center justify-center rounded-xl bg-muted'>
        <Icon className='size-8 text-muted-foreground' />
      </div>
      <h2 className='text-lg font-semibold'>{title}</h2>
      {description && (
        <p className='max-w-md text-sm text-muted-foreground'>{description}</p>
      )}
      <p className='text-xs text-muted-foreground'>该页面将在后续阶段实现</p>
    </div>
  )
}
