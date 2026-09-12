import { requireAuthUser } from '../../lib/route-auth'
import { updateAccountAvatar } from '../../lib/account-service'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/account/avatar（multipart，字段名 file）：服务端中转上传
 * Supabase Storage（webp/png/jpeg、≤2MB），返回 { avatar }（带缓存穿透时间戳）。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    const form = await readFormData(event)
    const file = form.get('file')

    if (!(file instanceof File)) {
      // 对齐 nest：缺 file 字段 → 400 AVATAR_FILE_INVALID（非 500）
      throw new ServerApiError(400, 'AVATAR_FILE_INVALID', '未提供头像文件')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await updateAccountAvatar(user.id, {
      buffer,
      mimetype: file.type,
      size: file.size
    })

    return jsonOk(result)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/avatar',
      method: 'POST'
    })
  }
})
