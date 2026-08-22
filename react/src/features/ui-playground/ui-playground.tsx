import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
// Hero UI (v3)
import {
  Avatar as HeroAvatar,
  Badge as HeroBadge,
  Button as HeroButton,
  Card as HeroCard,
  Checkbox as HeroCheckbox,
  Chip,
  Dropdown as HeroDropdown,
  Input as HeroInput,
  Modal as HeroModal,
  Pagination as HeroPagination,
  Radio as HeroRadio,
  RadioGroup as HeroRadioGroup,
  Select as HeroSelect,
  Switch as HeroSwitch,
  Tabs as HeroTabs,
  Tooltip as HeroTooltip,
  useOverlayState,
} from '@heroui/react'
import { ListBox, ListBoxItem } from 'react-aria-components'
// Shadcn UI（存量，项目真实使用）
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Main } from '@/components/layout/main'

/* ------------------------------------------------------------------ */
/* 区块容器：Hero UI 与 Shadcn UI 左右对照                              */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className='space-y-3'>
      <h2 className='text-lg font-medium'>{title}</h2>
      <div className='grid gap-4 lg:grid-cols-2'>{children}</div>
    </section>
  )
}

function Panel({
  label,
  children,
}: {
  label: 'Hero UI' | 'Shadcn UI'
  children: React.ReactNode
}) {
  return (
    <div className='rounded-xl border bg-card p-4 text-card-foreground shadow-xs'>
      <div
        data-slot='panel-label'
        className='mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase'
      >
        {label}
      </div>
      <div className='flex flex-wrap items-center gap-3'>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero Modal 演示（useOverlayState）                                  */
/* ------------------------------------------------------------------ */

function HeroModalDemo() {
  const state = useOverlayState()
  return (
    <>
      <HeroButton variant='primary' onPress={state.open}>
        打开 Modal（Hero）
      </HeroButton>
      <HeroModal state={state}>
        <HeroModal.Backdrop />
        <HeroModal.Container>
          <HeroModal.Dialog>
            <HeroModal.Header>
              <HeroModal.Heading>Hero UI Modal</HeroModal.Heading>
              <HeroModal.CloseTrigger />
            </HeroModal.Header>
            <HeroModal.Body>
              <p className='text-sm text-muted-foreground'>
                这是 Hero UI v3 的 Modal（React Aria Components）。
              </p>
            </HeroModal.Body>
            <HeroModal.Footer>
              <HeroButton variant='outline' onPress={state.close}>
                取消
              </HeroButton>
              <HeroButton variant='primary' onPress={state.close}>
                确定
              </HeroButton>
            </HeroModal.Footer>
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Shadcn Form 演示（react-hook-form + zod，方案不变）                  */
/* ------------------------------------------------------------------ */

const playgroundFormSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符'),
  email: z.string().email('邮箱格式不正确'),
})

function ShadcnFormDemo() {
  const form = useForm<z.infer<typeof playgroundFormSchema>>({
    resolver: zodResolver(playgroundFormSchema),
    defaultValues: { username: '', email: '' },
  })

  return (
    <Form {...form}>
      <form
        id='ui-playground-form'
        onSubmit={form.handleSubmit((values) => void values)}
        className='w-full max-w-xs space-y-4'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder='请输入用户名' {...field} />
              </FormControl>
              <FormDescription>
                Shadcn Form：react-hook-form + zod
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full'>
          提交
        </Button>
      </form>
    </Form>
  )
}

/* ------------------------------------------------------------------ */
/* 主页面：UI Playground                                              */
/* ------------------------------------------------------------------ */

const heroOptions = [
  { id: 'vue', label: 'Vue' },
  { id: 'react', label: 'React' },
  { id: 'next', label: 'Next.js' },
]

const shadcnTableData = [
  { name: '管理员', role: 'super_admin', status: '启用' },
  { name: '运营', role: 'operator', status: '停用' },
]

const PAGE_ITEMS = [1, 2, 3, 4, 5] as const

/**
 * UI Playground 页面（含布局包裹），供路由使用；与仓库其余路由文件模式一致。
 */
export function UiPlaygroundPage() {
  return (
    <Main>
      <UiPlayground />
    </Main>
  )
}

export function UiPlayground() {
  const [heroChecked, setHeroChecked] = useState(true)
  const [shadcnChecked, setShadcnChecked] = useState(true)
  const [showShadcnDialog, setShowShadcnDialog] = useState(false)

  return (
    <div className='space-y-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-bold tracking-tight'>UI Playground</h1>
        <p className='text-sm text-muted-foreground'>
          Hero UI（为主）+ Shadcn UI（补充）共存验证页。侧重点：两套组件在 Light
          / Dark 下是否看起来像同一个设计系统（按钮 / 输入 / 弹窗 / 下拉 / 卡片
          / 表格 / 表单 / 焦点环 / 圆角 / 边框 / 阴影 / 字体）。
        </p>
      </div>

      {/* 按钮 */}
      <Section title='按钮 Button'>
        <Panel label='Hero UI'>
          <HeroButton variant='primary'>主要按钮</HeroButton>
          <HeroButton variant='secondary'>次要按钮</HeroButton>
          <HeroButton variant='outline'>描边按钮</HeroButton>
          <HeroButton variant='ghost'>幽灵按钮</HeroButton>
          <HeroButton variant='danger'>危险按钮</HeroButton>
          <HeroButton variant='primary' size='sm'>
            小尺寸
          </HeroButton>
          <HeroButton variant='primary' isDisabled>
            禁用
          </HeroButton>
        </Panel>
        <Panel label='Shadcn UI'>
          <Button>默认按钮</Button>
          <Button variant='secondary'>次要按钮</Button>
          <Button variant='outline'>描边按钮</Button>
          <Button variant='ghost'>幽灵按钮</Button>
          <Button variant='destructive'>危险按钮</Button>
          <Button size='sm'>小尺寸</Button>
          <Button disabled>禁用</Button>
        </Panel>
      </Section>

      {/* 输入 */}
      <Section title='输入 Input'>
        <Panel label='Hero UI'>
          <HeroInput placeholder='请输入用户名' className='w-56' />
          <HeroInput placeholder='name@example.com' className='w-56' disabled />
        </Panel>
        <Panel label='Shadcn UI'>
          <Input placeholder='请输入用户名' className='w-56' />
          <Input placeholder='name@example.com' className='w-56' disabled />
        </Panel>
      </Section>

      {/* 选择 */}
      <Section title='选择 Select'>
        <Panel label='Hero UI'>
          <HeroSelect.Root placeholder='请选择技术栈' className='w-56'>
            <HeroSelect.Trigger>
              <HeroSelect.Value />
              <HeroSelect.Indicator />
            </HeroSelect.Trigger>
            <HeroSelect.Popover>
              <ListBox>
                {heroOptions.map((option) => (
                  <ListBoxItem key={option.id} id={option.id}>
                    {option.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </HeroSelect.Popover>
          </HeroSelect.Root>
        </Panel>
        <Panel label='Shadcn UI'>
          <Select>
            <SelectTrigger className='w-56'>
              <SelectValue placeholder='请选择技术栈' />
            </SelectTrigger>
            <SelectContent>
              {heroOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>
      </Section>

      {/* 弹窗 */}
      <Section title='弹窗 Modal / Dialog'>
        <Panel label='Hero UI'>
          <HeroModalDemo />
        </Panel>
        <Panel label='Shadcn UI'>
          <Dialog open={showShadcnDialog} onOpenChange={setShowShadcnDialog}>
            <DialogTrigger asChild>
              <Button variant='outline'>打开 Dialog（Shadcn）</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shadcn UI Dialog</DialogTitle>
                <DialogDescription>
                  这是 Shadcn UI 的 Dialog（Radix），与 Hero Modal 共存展示。
                </DialogDescription>
              </DialogHeader>
              <div className='text-sm'>弹窗内容区域。</div>
            </DialogContent>
          </Dialog>
        </Panel>
      </Section>

      {/* 下拉 */}
      <Section title='下拉 Dropdown'>
        <Panel label='Hero UI'>
          <HeroDropdown>
            <HeroDropdown.Trigger className='inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground'>
              打开菜单（Hero）
            </HeroDropdown.Trigger>
            <HeroDropdown.Popover>
              <HeroDropdown.Menu>
                <HeroDropdown.Item>新建项目</HeroDropdown.Item>
                <HeroDropdown.Item>复制</HeroDropdown.Item>
                <HeroDropdown.Item>重命名</HeroDropdown.Item>
                <HeroDropdown.Item className='text-danger'>
                  删除
                </HeroDropdown.Item>
              </HeroDropdown.Menu>
            </HeroDropdown.Popover>
          </HeroDropdown>
        </Panel>
        <Panel label='Shadcn UI'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline'>打开菜单（Shadcn）</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>新建项目</DropdownMenuItem>
              <DropdownMenuItem>复制</DropdownMenuItem>
              <DropdownMenuItem>重命名</DropdownMenuItem>
              <DropdownMenuItem className='text-destructive'>
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Panel>
      </Section>

      {/* Tabs */}
      <Section title='页签 Tabs'>
        <Panel label='Hero UI'>
          <HeroTabs className='w-72'>
            <HeroTabs.List>
              <HeroTabs.Tab id='overview'>概览</HeroTabs.Tab>
              <HeroTabs.Tab id='details'>详情</HeroTabs.Tab>
            </HeroTabs.List>
            <HeroTabs.Panel id='overview'>概览内容（Hero）</HeroTabs.Panel>
            <HeroTabs.Panel id='details'>详情内容（Hero）</HeroTabs.Panel>
          </HeroTabs>
        </Panel>
        <Panel label='Shadcn UI'>
          <Tabs defaultValue='overview' className='w-72'>
            <TabsList>
              <TabsTrigger value='overview'>概览</TabsTrigger>
              <TabsTrigger value='details'>详情</TabsTrigger>
            </TabsList>
            <TabsContent value='overview'>概览内容（Shadcn）</TabsContent>
            <TabsContent value='details'>详情内容（Shadcn）</TabsContent>
          </Tabs>
        </Panel>
      </Section>

      {/* 卡片 */}
      <Section title='卡片 Card'>
        <Panel label='Hero UI'>
          <HeroCard className='w-64'>
            <HeroCard.Header>
              <HeroCard.Title>Hero UI 卡片</HeroCard.Title>
              <HeroCard.Description>
                基于 --surface 语义表面
              </HeroCard.Description>
            </HeroCard.Header>
            <HeroCard.Content>卡片内容区域。</HeroCard.Content>
          </HeroCard>
        </Panel>
        <Panel label='Shadcn UI'>
          <Card className='w-64'>
            <CardHeader>
              <CardTitle>Shadcn UI 卡片</CardTitle>
              <CardDescription>基于 --card 语义表面</CardDescription>
            </CardHeader>
            <CardContent>卡片内容区域。</CardContent>
          </Card>
        </Panel>
      </Section>

      {/* 提示 */}
      <Section title='提示 Tooltip / 头像 / 徽标'>
        <Panel label='Hero UI'>
          <HeroTooltip>
            <HeroTooltip.Trigger>
              <HeroButton variant='outline'>悬停提示（Hero）</HeroButton>
            </HeroTooltip.Trigger>
            <HeroTooltip.Content>这是 Hero UI Tooltip</HeroTooltip.Content>
          </HeroTooltip>
          <HeroAvatar>
            <HeroAvatar.Fallback>BA</HeroAvatar.Fallback>
          </HeroAvatar>
          <HeroBadge color='accent'>徽标</HeroBadge>
          <HeroBadge color='success'>成功</HeroBadge>
          <HeroBadge color='danger'>危险</HeroBadge>
          <Chip color='accent'>Chip 标签</Chip>
          <Chip variant='soft'>软色 Chip</Chip>
        </Panel>
        <Panel label='Shadcn UI'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='outline'>悬停提示（Shadcn）</Button>
              </TooltipTrigger>
              <TooltipContent>这是 Shadcn UI Tooltip</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Avatar>
            <AvatarFallback>BA</AvatarFallback>
          </Avatar>
          <Badge>默认徽标</Badge>
          <Badge variant='secondary'>次要徽标</Badge>
          <Badge variant='destructive'>危险徽标</Badge>
        </Panel>
      </Section>

      {/* 表单控件 */}
      <Section title='表单控件 Checkbox / Switch / Radio'>
        <Panel label='Hero UI'>
          <HeroCheckbox isSelected={heroChecked} onChange={setHeroChecked}>
            同意协议（Hero）
          </HeroCheckbox>
          <HeroSwitch isSelected={heroChecked} onChange={setHeroChecked}>
            开关（Hero）
          </HeroSwitch>
          <HeroRadioGroup>
            <HeroRadio value='a' className='text-sm'>
              选项 A
            </HeroRadio>
            <HeroRadio value='b' className='text-sm'>
              选项 B
            </HeroRadio>
          </HeroRadioGroup>
        </Panel>
        <Panel label='Shadcn UI'>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={shadcnChecked}
              onCheckedChange={(checked) => setShadcnChecked(checked === true)}
            />
            同意协议（Shadcn）
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              checked={shadcnChecked}
              onCheckedChange={setShadcnChecked}
            />
            开关（Shadcn）
          </label>
          <RadioGroup defaultValue='a'>
            <div className='flex items-center gap-2 text-sm'>
              <RadioGroupItem value='a' id='hero-radio-a' />
              <label htmlFor='hero-radio-a'>选项 A</label>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <RadioGroupItem value='b' id='hero-radio-b' />
              <label htmlFor='hero-radio-b'>选项 B</label>
            </div>
          </RadioGroup>
        </Panel>
      </Section>

      {/* 表格 */}
      <Section title='表格 Table'>
        <Panel label='Hero UI'>
          <HeroCard className='w-full'>
            <HeroCard.Content>
              <p className='text-sm text-muted-foreground'>
                Hero UI v3 Table（React
                Aria）将在后续按需接入；复杂表格统一走项目 DataTable。
              </p>
            </HeroCard.Content>
          </HeroCard>
        </Panel>
        <Panel label='Shadcn UI'>
          <Table className='w-full'>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shadcnTableData.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </Section>

      {/* 分页 */}
      <Section title='分页 Pagination'>
        <Panel label='Hero UI'>
          <HeroPagination.Root aria-label='分页示例'>
            <HeroPagination.Content>
              <HeroPagination.Item>
                <HeroPagination.Previous>
                  <HeroPagination.PreviousIcon />
                </HeroPagination.Previous>
              </HeroPagination.Item>
              {PAGE_ITEMS.map((page) => (
                <HeroPagination.Item key={page}>
                  <HeroPagination.Link isActive={page === 1}>
                    {page}
                  </HeroPagination.Link>
                </HeroPagination.Item>
              ))}
              <HeroPagination.Item>
                <HeroPagination.Next>
                  <HeroPagination.NextIcon />
                </HeroPagination.Next>
              </HeroPagination.Item>
            </HeroPagination.Content>
          </HeroPagination.Root>
        </Panel>
        <Panel label='Shadcn UI'>
          <p className='text-sm text-muted-foreground'>
            项目列表页分页统一走 DataTablePagination（存量基础设施，不做迁移）。
          </p>
        </Panel>
      </Section>

      {/* Form / Command */}
      <Section title='Form 与 Command（Shadcn 存量基础设施）'>
        <Panel label='Hero UI'>
          <p className='text-sm text-muted-foreground'>
            表单技术方案保持 React Hook Form + Zod（不随组件库改变）；Hero UI
            表单控件后续按需组合。
          </p>
        </Panel>
        <Panel label='Shadcn UI'>
          <ShadcnFormDemo />
        </Panel>
      </Section>

      <Section title='Command（命令面板，Shadcn）'>
        <Panel label='Hero UI'>
          <p className='text-sm text-muted-foreground'>
            Hero UI 暂无 Command 组件，命令面板保留 Shadcn（cmdk）实现。
          </p>
        </Panel>
        <Panel label='Shadcn UI'>
          <Command className='w-72 rounded-lg border'>
            <CommandInput placeholder='搜索命令…' />
            <CommandList>
              <CommandEmpty>未找到结果</CommandEmpty>
              <CommandGroup heading='建议'>
                <CommandItem>用户管理</CommandItem>
                <CommandItem>角色管理</CommandItem>
                <CommandItem>系统设置</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </Panel>
      </Section>
    </div>
  )
}
