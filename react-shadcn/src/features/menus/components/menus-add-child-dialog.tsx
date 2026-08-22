'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GitBranchPlus } from 'lucide-react'
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
import { getMenuIcon } from '@/components/layout/data/menu-icon-map'
import { useAddChildMenu } from '../hooks/use-menu-mutations'
import { PermissionBitsSelect } from './permission-bits-select'

const formSchema = z.object({
  label: z.string().min(1, '请输入菜单名称。'),
  icon: z.string().min(1, '请输入图标标识。'),
  to: z.string().optional(),
  sort: z.string().regex(/^\d+$/, '请输入非负整数。'),
  permissions: z.string().regex(/^\d+$/, '请输入非负整数。'),
})
type AddChildForm = z.infer<typeof formSchema>

type MenusAddChildDialogProps = {
  parentRow: MenuNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenusAddChildDialog({
  parentRow,
  open,
  onOpenChange,
}: MenusAddChildDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addChildMenu = useAddChildMenu()

  const form = useForm<AddChildForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      icon: 'lucide:menu',
      to: '',
      sort: '0',
      permissions: '0',
    },
  })

  const watchIcon = useWatch({ control: form.control, name: 'icon' })

  const onSubmit = async (values: AddChildForm) => {
    setIsSubmitting(true)
    try {
      await addChildMenu.mutateAsync({
        parentId: parentRow.id,
        input: {
          label: values.label,
          icon: values.icon,
          to: values.to || undefined,
          sort: Number(values.sort),
          permissions: String(Number(values.permissions)),
        },
      })
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
          <DialogTitle>
            <GitBranchPlus className='me-1 inline-block size-5 align-text-top' />
            在「{parentRow.label}」下新增子菜单
          </DialogTitle>
          <DialogDescription>创建子级菜单并配置按钮权限位。</DialogDescription>
        </DialogHeader>
        <div className='max-h-105 overflow-y-auto pe-2'>
          <Form {...form}>
            <form
              id='menu-child-form'
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
                      <Input placeholder='如：用户列表' {...field} />
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
                      <Input placeholder='如：/users（目录留空）' {...field} />
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
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='menu-child-form' disabled={isSubmitting}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
