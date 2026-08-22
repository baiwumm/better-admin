import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 表格中心 loading 遮罩（Antd Table Loading 风格）。
 * - 保留旧数据：仅叠加半透明遮罩 + 中央 spinner，不清空表格内容。
 * - 仅在 isFetching（刷新/保存后 invalidate）时显示。
 */
export function TableLoadingOverlay({
  show,
  label = '加载中...',
  className,
}: {
  show: boolean
  label?: string
  className?: string
}) {
  if (!show) return null
  return (
    <div
      aria-busy='true'
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center',
        'bg-background/60 backdrop-blur-[1px]',
        className
      )}
    >
      <div className='flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm'>
        <Loader2 className='size-4 animate-spin' />
        {label}
      </div>
    </div>
  )
}