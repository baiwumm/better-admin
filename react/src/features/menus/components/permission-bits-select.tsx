'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { type PermissionKey } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  bitsToKeys,
  keysToBits,
  PERMISSION_OPTIONS,
} from '../lib/permission-bits'

/**
 * 按钮权限位下拉多选（表单场景）。
 * - 通过 Popover + Command 以勾选方式多选，值仍为位掩码字符串。
 * - 触发器内以徽标展示已选权限点（最多 3 个，超出折叠为 +N 角标）；
 *   底部提供全选 / 清空快捷操作。
 * - enabledKeys 可用于按菜单声明位过滤（角色授权等场景）。
 */
export function PermissionBitsSelect({
  value,
  onChange,
  enabledKeys,
  placeholder = '请选择按钮权限',
  className,
}: {
  /** 当前位掩码（字符串，如 '3'） */
  value: string
  onChange: (bits: string) => void
  /** 仅渲染这些权限点；不传则渲染全部 */
  enabledKeys?: PermissionKey[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  /** 触发器中最多直接展示的已选徽标数，超出折叠为 +N 角标 */
  const MAX_VISIBLE_BADGES = 3
  const current = bitsToKeys(value)
  const options = enabledKeys
    ? PERMISSION_OPTIONS.filter((o) => enabledKeys.includes(o.key))
    : PERMISSION_OPTIONS

  if (options.length === 0) return null

  const selectedOptions = options.filter((o) => current.includes(o.key))
  const visibleBadges = selectedOptions.slice(0, MAX_VISIBLE_BADGES)
  const overflowCount = selectedOptions.length - visibleBadges.length
  const allSelected = options.every((o) => current.includes(o.key))

  const toggle = (key: PermissionKey) => {
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    onChange(keysToBits(next))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selectedOptions.length > 0 ? (
            <span className='flex min-w-0 items-center gap-1 overflow-hidden'>
              {visibleBadges.map((opt) => {
                const Icon = opt.icon
                return (
                  <span
                    key={opt.key}
                    className='inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs'
                  >
                    <Icon className='size-3' />
                    {opt.label}
                  </span>
                )
              })}
              {overflowCount > 0 && (
                <span className='inline-flex shrink-0 items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground'>
                  +{overflowCount}
                </span>
              )}
            </span>
          ) : (
            <span className='text-muted-foreground'>{placeholder}</span>
          )}
          <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-72 p-0' align='start'>
        <Command>
          <CommandInput placeholder='搜索权限...' />
          <CommandList>
            <CommandEmpty>未找到权限</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const checked = current.includes(opt.key)
                const Icon = opt.icon
                return (
                  <CommandItem
                    key={opt.key}
                    value={opt.label}
                    className='flex items-center gap-2'
                    onSelect={() => toggle(opt.key)}
                  >
                    <Icon className='size-3.5' />
                    <span className='flex-1'>{opt.label}</span>
                    {checked && <Check className='size-4 shrink-0' />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className='flex items-center gap-2 border-t p-2'>
          <button
            type='button'
            onClick={() =>
              onChange(keysToBits(options.map((o) => o.key as PermissionKey)))
            }
            disabled={allSelected}
            className='text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50'
          >
            全选
          </button>
          <span className='text-muted-foreground'>/</span>
          <button
            type='button'
            onClick={() => onChange('0')}
            disabled={current.length === 0}
            className='text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50'
          >
            清空
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
