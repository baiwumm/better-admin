import { BarChart3 } from 'lucide-react'

/**
 * 概览图表占位。
 * 原组件使用 Math.random() 生成硬编码演示数据，已按要求移除 Mock。
 * 真实数据需由后端提供统计接口（如 GET /api/dashboard/stats）后接入。
 */
export function Overview() {
  return (
    <div className='flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground'>
      <BarChart3 className='size-8' />
      <p className='text-sm'>图表数据接入中</p>
    </div>
  )
}
