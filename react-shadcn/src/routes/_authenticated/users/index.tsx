import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Users } from '@/features/users'

const usersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // 关键字搜索（用户名 / 邮箱 / 姓名）→ 后端 search 参数
  search: z.string().optional().catch(''),
  // 状态过滤（多选，后端接受单值，取第一个）
  status: z
    .array(z.enum(['active', 'disabled']))
    .optional()
    .catch([]),
  // 服务端排序
  sort: z.string().optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: usersSearchSchema,
  component: Users,
})
