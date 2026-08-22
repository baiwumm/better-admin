'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SelectDropdown } from '@/components/select-dropdown'
import { statusOptions } from '../data/data'
import { userStatusSchema, type User } from '../data/schema'
import { useCreateUser, useRoleOptions, useUpdateUser } from '../hooks/use-users'

const formSchema = z.object({
  // 编辑模式下 username 输入框 disabled，不参与表单提交，故改为可选（创建时手动校验）
  username: z.string().optional(),
  displayName: z.string().min(1, '请输入姓名。'),
  email: z.email({
    error: (iss) => (iss.input === '' ? '请输入邮箱。' : undefined),
  }),
  status: userStatusSchema,
  roleIds: z.array(z.string()),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})
type UserForm = z.infer<typeof formSchema>

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const isEdit = !!currentRow
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const { data: roleOptions = [], isLoading: rolesLoading } = useRoleOptions()

  // 编辑回显：从 currentRow.roles 提取 id 列表
  const defaultRoleIds = useMemo(
    () => (isEdit ? (currentRow?.roles ?? []).map((r) => r.id) : []),
    [isEdit, currentRow]
  )

  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          username: currentRow.username,
          displayName: currentRow.displayName,
          email: currentRow.email,
          status: currentRow.status,
          roleIds: defaultRoleIds,
          password: '',
          confirmPassword: '',
        }
      : {
          username: '',
          displayName: '',
          email: '',
          status: 'active',
          roleIds: [],
          password: '',
          confirmPassword: '',
        },
  })

  const onSubmit = async (values: UserForm) => {
    if (!isEdit) {
      if (!values.username || !values.username.trim()) {
        form.setError('username', { message: '请输入用户名。' })
        return
      }
      const { password, confirmPassword } = values
      if (!password || password.length < 6) {
        form.setError('password', { message: '密码长度至少为 6 位。' })
        return
      }
      if (password !== confirmPassword) {
        form.setError('confirmPassword', { message: '两次输入的密码不一致。' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: currentRow.id,
          input: {
            displayName: values.displayName,
            email: values.email,
            status: values.status,
            roleIds: values.roleIds,
          },
        })
      } else {
        await createUser.mutateAsync({
          username: values.username ?? '',
          displayName: values.displayName,
          email: values.email,
          password: values.password ?? '',
          confirmPassword: values.confirmPassword ?? '',
          status: values.status,
          roleIds: values.roleIds,
        })
      }
      close()
    } catch {
      // 错误已由 useMutation onError 提示
    } finally {
      setIsSubmitting(false)
    }
  }

  const close = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => (!state ? close() : undefined)}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '在此更新用户信息。' : '在此创建新用户。'}
            完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <Form {...form}>
            <form
              id='user-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 px-0.5'
            >
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>
                      用户名
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入用户名'
                        className='col-span-4'
                        autoComplete='off'
                        disabled={isEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='displayName'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>姓名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='请输入姓名'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='user@example.com'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>状态</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='请选择状态'
                      className='col-span-4'
                      items={statusOptions.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='roleIds'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-end'>角色</FormLabel>
                    <Popover
                      open={rolePopoverOpen}
                      onOpenChange={setRolePopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type='button'
                            variant='outline'
                            role='combobox'
                            aria-expanded={rolePopoverOpen}
                            className='col-span-4 justify-between font-normal'
                            disabled={rolesLoading}
                          >
                            {rolesLoading ? (
                              <span className='flex items-center gap-2 text-muted-foreground'>
                                <Loader2 className='size-4 animate-spin' />
                                加载角色...
                              </span>
                            ) : field.value.length > 0 ? (
                              <span className='flex flex-wrap gap-1'>
                                {roleOptions
                                  .filter((r) => field.value.includes(r.id))
                                  .map((r) => (
                                    <span
                                      key={r.id}
                                      className='rounded-full bg-secondary px-2 py-0.5 text-xs'
                                    >
                                      {r.name}
                                    </span>
                                  ))}
                              </span>
                            ) : (
                              <span className='text-muted-foreground'>
                                请选择角色（可不选）
                              </span>
                            )}
                            <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-64 p-0' align='start'>
                        <Command>
                          <CommandInput placeholder='搜索角色...' />
                          <CommandList>
                            <CommandEmpty>未找到角色</CommandEmpty>
                            <CommandGroup>
                              {roleOptions.map((role) => {
                                const checked = field.value.includes(role.id)
                                return (
                                  <CommandItem
                                    key={role.id}
                                    value={role.name}
                                    className='flex items-center gap-2'
                                    onSelect={() => {
                                      if (checked) {
                                        field.onChange(
                                          field.value.filter(
                                            (id) => id !== role.id
                                          )
                                        )
                                      } else {
                                        field.onChange([...field.value, role.id])
                                      }
                                    }}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => {
                                        if (checked) {
                                          field.onChange(
                                            field.value.filter(
                                              (id) => id !== role.id
                                            )
                                          )
                                        } else {
                                          field.onChange([
                                            ...field.value,
                                            role.id,
                                          ])
                                        }
                                      }}
                                    />
                                    <span className='flex-1'>{role.name}</span>
                                    {checked && (
                                      <Check className='size-4 shrink-0' />
                                    )}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              {!isEdit && (
                <>
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          密码
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder='请输入密码'
                            className='col-span-4'
                            autoComplete='new-password'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='confirmPassword'
                    render={({ field }) => (
                      <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                        <FormLabel className='col-span-2 text-end'>
                          确认密码
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder='请再次输入密码'
                            className='col-span-4'
                            autoComplete='new-password'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className='col-span-4 col-start-3' />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='animate-spin' />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
