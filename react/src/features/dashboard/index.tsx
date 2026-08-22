import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { HeaderActions } from '@/components/layout/header-actions'
import { Main } from '@/components/layout/main'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

export function Dashboard() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <HeaderActions />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>仪表盘</h1>
          <div className='flex items-center space-x-2'>
            <Button>下载</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>概览</TabsTrigger>
              <TabsTrigger value='analytics'>分析</TabsTrigger>
              <TabsTrigger value='reports' disabled>
                报表
              </TabsTrigger>
              <TabsTrigger value='notifications' disabled>
                通知
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>总营收</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>-</div>
                  <p className='text-xs text-muted-foreground'>数据接入中</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>订阅数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>-</div>
                  <p className='text-xs text-muted-foreground'>数据接入中</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>销售额</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>-</div>
                  <p className='text-xs text-muted-foreground'>数据接入中</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>当前活跃</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>-</div>
                  <p className='text-xs text-muted-foreground'>数据接入中</p>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>概览</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>最近销售</CardTitle>
                  <CardDescription>暂无数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
