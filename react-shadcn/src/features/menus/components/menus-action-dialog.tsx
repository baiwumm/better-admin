'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { type MenuNode } from '@/lib/api-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import { getMenuIcon } from '@/components/layout/data/menu-icon-map'
import { useCreateMenu, useUpdateMenu } from '../hooks/use-menu-mutations'
import { PermissionBitsSelect } from './permission-bits-select'

const formSchema = z.object({
  label: z.string().min(1, '请输入菜单名称。'),
  icon: z.string().min(1, '请输入图标标识。'),
  to: z.string().optional(),
  sort: z.string().regex(/^\d+$/, '请输入非负整数。'),
  enabled: z.boolean(),
  hideInMenu: z.boolean(),
  keepAlive: z.boolean(),
  defaultOpen: z.boolean(),
  target: z.enum(['_self', '_blank']),
  permissions: z.string().regex(/^\d+$/, '请输入非负整数。'),
})
type MenuForm = z.infer<typeof formSchema>

type MenusActionDialogProps = {
  currentRow?: MenuNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenusActionDialog({
  currentRow,
  open,
  onOpenChange,
}: MenusActionDialogProps) {
  const isEdit = !!currentRow
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createMenu = useCreateMenu()
  const updateMenu = useUpdateMenu()

  const form = useForm<MenuForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          label: currentRow.label,
          icon: currentRow.icon,
          to: currentRow.to ?? '',
          sort: String(currentRow.sort),
          enabled: currentRow.enabled,
          hideInMenu: currentRow.hideInMenu,
          keepAlive: currentRow.keepAlive,
          defaultOpen: currentRow.defaultOpen,
          target: currentRow.target,
          permissions: String(currentRow.permissions || '0'),
        }
      : {
          label: '',
          icon: 'lucide:menu',
          to: '',
          sort: '0',
          enabled: true,
          hideInMenu: false,
          keepAlive: false,
          defaultOpen: false,
          target: '_self',
          permissions: '0',
        },
  })

  const watchIcon = useWatch({ control: form.control, name: 'icon' })

  const onSubmit = async (values: MenuForm) => {
    setIsSubmitting(true)
    try {
      if (isEdit) {
        await updateMenu.mutateAsync({
          id: currentRow.id,
          input: {
            label: values.label,
            icon: values.icon,
            to: values.to || null,
            sort: Number(values.sort),
            enabled: values.enabled,
            hideInMenu: values.hideInMenu,
            keepAlive: values.keepAlive,
            defaultOpen: values.defaultOpen,
            target: values.target,
            permissions: String(Number(values.permissions)),
          },
        })
      } else {
        await createMenu.mutateAsync({
          label: values.label,
          icon: values.icon,
          to: values.to || undefined,
          sort: Number(values.sort),
          enabled: values.enabled,
          hideInMenu: values.hideInMenu,
          keepAlive: values.keepAlive,
          defaultOpen: values.defaultOpen,
          target: values.target,
          permissions: String(Number(values.permissions)),
        })
      }
      form.reset()
      onOpenChange(false)
    } catch {
      // 错误已由 useMutation onError 提示
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑菜单' : '新增菜单'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新菜单信息。' : '在此创建顶级菜单。'}
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-105 overflow-y-auto pe-2'>
          <Form {...form}>
            <form
              id='menu-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='label'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>菜单名称</FormLabel>
                    <FormControl>
                      <Input placeholder='如：数据大屏' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='icon'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>图标</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <span className='inline-flex size-9 items-center justify-center rounded-md border bg-background'>
                          {(() => {
                            const Icon = getMenuIcon(watchIcon)
                            return <Icon className='size-4' />
                          })()}
                        </span>
                        <Input
                          placeholder='lucide:users'
                          {...field}
                          className='flex-1'
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      使用 lucide 图标标识，如 lucide:users、lucide:settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='to'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>路由地址</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='如：/dashboard（目录留空）'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='sort'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>排序</FormLabel>
                    <FormControl>
                      <Input type='number' min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='permissions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>按钮权限位</FormLabel>
                    <FormControl>
                      <PermissionBitsSelect
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className='text-xs'>
                      不勾选则保存为 0，该菜单将无可操作按钮。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='target'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>跳转方式</FormLabel>
                      <p className='text-sm text-muted-foreground'>
                        新窗口打开（_blank）
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === '_blank'}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? '_blank' : '_self')
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='enabled'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>启用</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='hideInMenu'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>在菜单中隐藏</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='keepAlive'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>缓存页面</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='defaultOpen'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <FormLabel>默认展开</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='menu-form' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='animate-spin' />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
