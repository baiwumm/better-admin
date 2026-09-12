import { Permissions } from '../../lib/permissions'
import { requireAuthUser } from '../../lib/route-auth'
import { updateUser } from '../../lib/users-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'
import { EMAIL_PATTERN } from '../../../app/lib/constants'

/** PUT /api/users/:id（EDIT 位）— 更新（停用走目标保护校验）。 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.EDIT)

    const id = getRouterParam(event, 'id')

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    // 对齐 nest @IsOptional + @IsEmail：email 有传（含空串）须为合法邮箱
    if (typeof body.email === 'string' && !EMAIL_PATTERN.test(body.email)) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '邮箱格式不正确')
    }

    // 契约 v1.7.3：长度约束（对齐 nest UpdateUserDto @Size/@MaxLength）
    if (
      typeof body.displayName === 'string'
      && (body.displayName.trim().length < 1
        || body.displayName.trim().length > 50)
    ) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '姓名长度为 1-50 字符')
    }
    if (typeof body.email === 'string' && body.email.length > 100) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '邮箱最长 100 字符')
    }

    const user = await updateUser(
      id as string,
      {
        email: typeof body.email === 'string' ? body.email : undefined,
        displayName:
          typeof body.displayName === 'string'
            ? body.displayName.trim()
            : undefined,
        avatar:
          body.avatar === undefined
            ? undefined
            : typeof body.avatar === 'string' || body.avatar === null
              ? (body.avatar as string | null)
              : undefined,
        status:
          body.status === 'active' || body.status === 'disabled'
            ? body.status
            : undefined,
        roleIds: Array.isArray(body.roleIds)
          ? (body.roleIds as string[])
          : undefined,
        // 组织中心关联（契约 v1.6.0）：undefined = 不修改；null = 清空
        deptId:
          body.deptId === undefined
            ? undefined
            : typeof body.deptId === 'string' && body.deptId.length > 0
              ? body.deptId
              : null,
        employeeNo:
          body.employeeNo === undefined
            ? undefined
            : typeof body.employeeNo === 'string' && body.employeeNo.length > 0
              ? body.employeeNo
              : null,
        entryDate:
          body.entryDate === undefined
            ? undefined
            : typeof body.entryDate === 'string' && body.entryDate.length > 0
              ? body.entryDate
              : null,
        employmentStatus:
          body.employmentStatus === 'employed'
          || body.employmentStatus === 'resigned'
            ? body.employmentStatus
            : undefined,
        gender:
          body.gender === 'male' || body.gender === 'female'
            ? body.gender
            : body.gender === null || body.gender === ''
              ? null
              : undefined,
        postIds: Array.isArray(body.postIds)
          ? (body.postIds as string[])
          : undefined,
        mainPostId:
          body.mainPostId === undefined
            ? undefined
            : typeof body.mainPostId === 'string' && body.mainPostId.length > 0
              ? body.mainPostId
              : null
      },
      operator
    )

    return jsonOk(user)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/users/:id', method: 'PUT' })
  }
})
