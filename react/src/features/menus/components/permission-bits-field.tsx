import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  bitsToKeys,
  keysToBits,
  PERMISSION_OPTIONS,
} from '../lib/permission-bits'
import { type PermissionKey } from '@/lib/permissions'

/**
 * 按钮权限位勾选组（菜单声明位 / 角色授权位共用）。
 * - 角色授权按菜单声明位过滤时传入 enabledKeys。
 * - 全选 / 清空快捷按钮（compact 模式下隐藏）。
 */
export function PermissionBitsField({
  value,
  onChange,
  enabledKeys,
  compact = false,
  className,
}: {
  /** 当前位掩码（字符串，如 '3'） */
  value: string
  onChange: (bits: string) => void
  /** 仅渲染这些权限点（如角色授权按菜单声明位过滤）；不传则渲染全部 */
  enabledKeys?: PermissionKey[]
  /** 紧凑模式：隐藏全选/清空/当前值（用于行内嵌入，如角色授权） */
  compact?: boolean
  className?: string
}) {
  const current = bitsToKeys(value)
  const options = enabledKeys
    ? PERMISSION_OPTIONS.filter((o) => enabledKeys.includes(o.key))
    : PERMISSION_OPTIONS

  if (options.length === 0) return null

  const allSelected = options.every((o) => current.includes(o.key))
  const someSelected = options.some((o) => current.includes(o.key))

  const toggle = (key: PermissionKey) => {
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    onChange(keysToBits(next))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        {options.map((opt) => {
          const Icon = opt.icon
          const checked = current.includes(opt.key)
          return (
            <label
              key={opt.key}
              className='flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground'
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(opt.key)}
                aria-label={`${opt.label}权限`}
              />
              <Icon className='size-3.5' />
              {opt.label}
            </label>
          )
        })}
      </div>
      {!compact && (
        <div className='flex items-center gap-2'>
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
            disabled={!someSelected || current.length === 0}
            className='text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50'
          >
            清空
          </button>
          <span className='ms-1 text-xs text-muted-foreground'>
            当前值：{value}
          </span>
        </div>
      )}
    </div>
  )
}