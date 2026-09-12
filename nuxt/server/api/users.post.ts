import { Permissions } from '../lib/permissions'
import { requireAuthUser } from '../lib/route-auth'
import { createUser } from '../lib/users-service'
import { jsonOk, handleRouteError } from '../lib/route-helpers'
import { ServerApiError } from '../lib/http'
import { assertPasswordFormat } from '../lib/password-policy'
import { EMAIL_PATTERN } from '../../app/lib/constants'

/**
 * POST /api/users（ADD 位）：创建（成功 200，非 201，与契约一致）。
 * DELETE /api/users?ids=（BATCH_DELETE 位）：批量软删（query ids 逗号分隔，全有全无）。
 */
export default defineEventHandler(async (event) => {
  try {
    const operator = await requireAuthUser(event, Permissions.ADD)

    const body = (await readBody(event)) as {
      username?: string
      email?: string
      password?: string
      displayName?: string
      avatar?: string
      status?: string
      roleIds?: string[]
      deptId?: string | null
      employeeNo?: string | null
      entryDate?: string | null
      employmentStatus?: string | null
      gender?: 'male' | 'female' | null
      postIds?: string[]
      mainPostId?: string | null
    }

    // 契约 UserCreateRequest required [username, email, password, displayName]
    if (
      typeof body?.username !== 'string'
      || body.username.trim().length === 0
      || typeof body?.email !== 'string'
      || body.email.length === 0
      || typeof body?.password !== 'string'
      || typeof body?.displayName !== 'string'
      || body.displayName.trim().length === 0
    ) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求参数无效')
    }

    // 对齐 nest @IsEmail（契约 UserCreateRequest email format）
    if (!EMAIL_PATTERN.test(body.email)) {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '邮箱格式不正确')
    }

    // 契约 v1.7.3：长度上限（对齐 nest CreateUserDto @MaxLength）
    if (
      body.username.trim().length > 50
      || body.displayName.trim().length > 50
      || body.email.length > 100
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        '用户名/姓名最长 50 字符，邮箱最长 100 字符'
      )
    }

    // 契约 v1.8.0 密码策略格式项（对齐 nest @IsPolicyPassword）；含 username 的跨字段项在 createUser
    assertPasswordFormat(body.password)

    const user = await createUser(
      {
        username: body.username.trim(),
        email: body.email,
        password: body.password,
        displayName: body.displayName.trim(),
        avatar: body.avatar,
        status: body.status,
        roleIds: Array.isArray(body.roleIds) ? body.roleIds : undefined,
        deptId:
          typeof body.deptId === 'string' && body.deptId.length > 0
            ? body.deptId
            : null,
        employeeNo:
          typeof body.employeeNo === 'string' && body.employeeNo.length > 0
            ? body.employeeNo
            : null,
        entryDate:
          typeof body.entryDate === 'string' && body.entryDate.length > 0
            ? body.entryDate
            : null,
        employmentStatus:
          body.employmentStatus === 'employed'
          || body.employmentStatus === 'resigned'
            ? body.employmentStatus
            : null,
        gender:
          body.gender === 'male' || body.gender === 'female'
            ? body.gender
            : null,
        postIds: Array.isArray(body.postIds) ? body.postIds : undefined,
        mainPostId:
          typeof body.mainPostId === 'string' && body.mainPostId.length > 0
            ? body.mainPostId
            : null
      },
      operator.id
    )

    return jsonOk(user)
  } catch (error) {
    return handleRouteError(event, error, { path: '/api/users', method: 'POST' })
  }
})
