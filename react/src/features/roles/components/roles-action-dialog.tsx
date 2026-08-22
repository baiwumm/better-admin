'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type Role } from '@/lib/api-types'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateRole,
  useUpdateRole,
  type RoleCreateInput,
} from '../hooks/use-roles'

const formSchema = z.object({
  name: z.string().min(1, '请输入角色名称。'),
  code: z
    .string()
    .min(1, '请输入角色编码。')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      '编码需为小写字母、数字、下划线，且以字母开头。'
    ),
  description: z.string().optional(),
  enabled: z.boolean(),
  sort: z.string().regex(/^\d+$/, '请输入非负整数。'),
})
type RoleForm = z.infer<typeof formSchema>

type RolesActionDialogProps = {
  currentRow?: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RolesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: RolesActionDialogProps) {
  const isEdit = !!currentRow
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const form = useForm<RoleForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          name: currentRow.name,
          code: currentRow.code,
          description: currentRow.description ?? '',
          enabled: currentRow.enabled,
          sort: String(currentRow.sort),
        }
      : {
          name: '',
          code: '',
          description: '',
          enabled: true,
          sort: '0',
        },
  })

  const onSubmit = async (values: RoleForm) => {
    setIsSubmitting(true)
    try {
      if (isEdit) {
        await updateRole.mutateAsync({
          id: currentRow.id,
          input: {
            name: values.name,
            description: values.description || undefined,
            enabled: values.enabled,
            sort: Number(values.sort),
          },
        })
      } else {
        const input: RoleCreateInput = {
          name: values.name,
          code: values.code,
          description: values.description || undefined,
          enabled: values.enabled,
          sort: Number(values.sort),
        }
        await createRole.mutateAsync(input)
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
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新角色信息。' : '在此创建新角色。'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='role-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称</FormLabel>
                  <FormControl>
                    <Input placeholder='如：运营人员' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色编码</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='如：operator'
                      disabled={isEdit}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEdit ? '编码创建后不可修改。' : '用于系统内部标识角色。'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='角色的职责说明（可选）'
                      className='resize-none'
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
                  <FormLabel>排序</FormLabel>
                  <FormControl>
                    <Input type='number' min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div>
                    <FormLabel>启用角色</FormLabel>
                    <p className='text-sm text-muted-foreground'>
                      停用后该角色下的用户将失去相应权限。
                    </p>
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
        <DialogFooter>
          <Button type='submit' form='role-form' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='animate-spin' />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
