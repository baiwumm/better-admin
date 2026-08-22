import { z } from 'zod'

/**
 * 用户状态：与后端 openapi.yaml User.status 对齐（active / disabled）
 */
const userStatusSchema = z.enum(['active', 'disabled'])
export type UserStatus = z.infer<typeof userStatusSchema>
export { userStatusSchema }

/** 用户关联的角色（user_roles → roles 联查） */
const userRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
})
export type UserRole = z.infer<typeof userRoleSchema>
export { userRoleSchema }

/** 用户列表项（GET /api/users），与后端 User 对齐 */
const _userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatar: z.string().nullable().optional(),
  status: userStatusSchema,
  roles: z.array(userRoleSchema).optional().default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof _userSchema>

/** 创建用户（POST /api/users） */
export const userCreateSchema = z
  .object({
    username: z.string().min(1, '请输入用户名。'),
    displayName: z.string().min(1, '请输入姓名。'),
    email: z.email({
      error: (iss) => (iss.input === '' ? '请输入邮箱。' : undefined),
    }),
    password: z
      .string()
      .min(1, '请输入密码。')
      .min(6, '密码长度至少为 6 位。')
      .transform((pwd) => pwd.trim()),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    status: userStatusSchema.default('active'),
    roleIds: z.array(z.string()).default([]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致。',
    path: ['confirmPassword'],
  })
export type UserCreateInput = z.infer<typeof userCreateSchema>

/**
 * 编辑用户（PUT /api/users/:id）。
 * 注意：后端编辑接口不接收密码（密码通过 reset-password 单独修改）。
 */
export const userUpdateSchema = z.object({
  displayName: z.string().min(1, '请输入姓名。'),
  email: z.email({
    error: (iss) => (iss.input === '' ? '请输入邮箱。' : undefined),
  }),
  status: userStatusSchema,
  roleIds: z.array(z.string()).default([]),
})
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
