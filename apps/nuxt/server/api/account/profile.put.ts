import { requireAuthUser } from '../../lib/route-auth'
import { updateAccountProfile } from '../../lib/account-service'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * PUT /api/account/profile：更新基本信息
 * （displayName/phone/tags/website/githubUsername/xUsername）。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuthUser(event)

    let body: Record<string, unknown>

    try {
      body = await readBody(event)
    } catch {
      body = {}
    }

    const profile = await updateAccountProfile(user.id, {
      displayName:
        typeof body.displayName === 'string' ? body.displayName : undefined,
      phone:
        body.phone === undefined
          ? undefined
          : typeof body.phone === 'string' && body.phone.length > 0
            ? body.phone
            : null,
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      website:
        body.website === undefined
          ? undefined
          : typeof body.website === 'string' && body.website.length > 0
            ? body.website
            : null,
      githubUsername:
        body.githubUsername === undefined
          ? undefined
          : typeof body.githubUsername === 'string'
            && body.githubUsername.length > 0
            ? body.githubUsername
            : null,
      xUsername:
        body.xUsername === undefined
          ? undefined
          : typeof body.xUsername === 'string' && body.xUsername.length > 0
            ? body.xUsername
            : null
    })

    return jsonOk(profile)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/account/profile',
      method: 'PUT'
    })
  }
})
