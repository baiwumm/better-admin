import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * 分析页占位。
 * 原组件包含硬编码的点击量、访客、跳出率、来源、设备等假指标，
 * 已按要求移除 Mock。真实数据需由后端提供统计接口后接入。
 */
export function Analytics() {
  return (
    <div className='space-y-4'>
      <div className='flex h-[300px] items-center justify-center rounded-md border text-sm text-muted-foreground'>
        分析数据接入中
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>总点击量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>-</div>
            <p className='text-xs text-muted-foreground'>数据接入中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>独立访客</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>-</div>
            <p className='text-xs text-muted-foreground'>数据接入中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>跳出率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>-</div>
            <p className='text-xs text-muted-foreground'>数据接入中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>平均时长</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>-</div>
            <p className='text-xs text-muted-foreground'>数据接入中</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
