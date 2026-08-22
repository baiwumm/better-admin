import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Better Admin Logo（品牌标识）
 *
 * 浅色模式：黑底 + 白图形；深色模式自动反转为白底 + 黑图形。
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='better-admin-logo'
      viewBox='0 0 256 256'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('size-8', className)}
      {...props}
    >
      <title>Better Admin</title>
      <rect
        width='256'
        height='256'
        rx='57'
        className='fill-[#0a0a0a] dark:fill-white'
      />
      <rect
        x='60.5'
        y='60.5'
        width='92.5'
        height='135'
        rx='7'
        className='fill-white dark:fill-[#0a0a0a]'
      />
      <rect
        x='163.5'
        y='60.5'
        width='42.75'
        height='60.5'
        rx='7'
        className='fill-white dark:fill-[#0a0a0a]'
      />
      <rect
        x='163.5'
        y='131.5'
        width='42.75'
        height='64'
        rx='7'
        className='fill-white dark:fill-[#0a0a0a]'
      />
    </svg>
  )
}
