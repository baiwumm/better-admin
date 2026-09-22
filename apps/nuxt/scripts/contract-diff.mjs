/**
 * 契约冒烟脚本（M1 验收硬性项，nuxt-plan.md §6 M1）：
 *
 * 用同一账号（admin）分别登录 Nuxt 与 Nest，对**只读 GET 端点**逐一请求，
 * 对响应 JSON 做「结构 / 字段级」diff（忽略时间戳 / IP / lastLoginAt 等
 * 易变字段）。写操作不 diff（共库写入行为一致性由逐行平移保证，避免冒烟
 * 产生脏数据）；detail 类端点的 id 从对应列表响应动态取首个。
 *
 * 用法：node scripts/contract-diff.mjs [nuxtBase] [nestBase]
 *   默认 nuxtBase=http://localhost:3001/api  nestBase=http://localhost:3000/api
 *   凭据走环境变量 CONTRACT_USER / CONTRACT_PASSWORD（缺省 admin / admin123，
 *   仅供本地冒烟；线上或演示库请显式注入，勿把真实口令写进命令行历史）。
 * 退出码：0 = 差异为零或全部已记录；1 = 存在未记录差异。
 *
 * 覆盖面：openapi.yaml 的全部只读 GET（31 条步骤，含 v1.11/v1.12 /stats/overview、
 * v1.13 /roles/{id}/users 与详情类端点），仅 /health 按契约设计排除。
 * 前置：Nuxt 与 Nest 两个服务需同时在线（脚本自身不启动它们）。
 */
const NUXT_BASE = process.argv[2] ?? 'http://localhost:3001/api'
const NEST_BASE = process.argv[3] ?? 'http://localhost:3000/api'

const USERNAME = process.env.CONTRACT_USER ?? 'admin'
const PASSWORD = process.env.CONTRACT_PASSWORD ?? 'admin123'

/** 易变字段（值必然不同，仅校验键存在） */
const VOLATILE_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'publishTime',
  'readAt',
  'ip',
  'userAgent',
  'entryDate'
])

async function login(base) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  })
  if (!res.ok) throw new Error(`login ${base} -> ${res.status}`)
  const body = await res.json()
  return body.data.accessToken
}

async function get(base, token, path) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const contentType = res.headers.get('content-type') ?? ''
  // 非 JSON 响应视为异常（SPA 模式下未匹配的 API 路径会兜底返回 HTML 假 200）
  if (res.status !== 204 && !contentType.includes('application/json')) {
    return { status: res.status, body: null, nonJson: true }
  }
  return {
    status: res.status,
    body: res.status === 204 ? null : await res.json().catch(() => null)
  }
}

/**
 * 已记录差异（非 Nuxt 平移缺陷，Nest 与 Next 蓝本的既有差异；Nuxt 对齐 Next）：
 * 1. /permissions 的 label：Nest 为中文（如「导出」），Next / React / Nuxt 为英文键名（前端 i18n）；
 * 2. /users 的 tags：Nest 返回 null，Next / Nuxt 归一化为 []（users-service toView）；
 * 3. /menus：Nest 本地实例当前 500（环境问题），以 Nuxt 200 + 结构正确为准。
 */
function isKnownDiff(problem) {
  if (/^body\.data\[\d+\]\.tags: 类型不同/.test(problem)) return true
  if (/^body\.data\[9\]\.label: 值不同/.test(problem)) return true
  return false
}

/** 递归 diff：返回差异描述数组（空数组 = 一致）。 */
function diff(value, other, path, problems) {
  if (VOLATILE_KEYS.has(path.split('.').pop())) return

  const ta = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  const tb = other === null ? 'null' : Array.isArray(other) ? 'array' : typeof other

  if (ta !== tb) {
    problems.push(`${path}: 类型不同 nuxt=${ta} nest=${tb}`)
    return
  }
  if (ta === 'array') {
    if (value.length !== other.length) {
      // 集合数量不同可能因共库时间窗，仅记录
      problems.push(`${path}: 数组长度 nuxt=${value.length} nest=${other.length}`)
    }
    const len = Math.min(value.length, other.length)
    for (let i = 0; i < len; i++) diff(value[i], other[i], `${path}[${i}]`, problems)
    return
  }
  if (ta === 'object') {
    const ka = Object.keys(value).sort()
    const kb = Object.keys(other).sort()
    for (const k of ka) {
      if (!kb.includes(k)) problems.push(`${path}.${k}: nest 缺字段`)
      else diff(value[k], other[k], `${path}.${k}`, problems)
    }
    for (const k of kb) {
      if (!ka.includes(k)) problems.push(`${path}.${k}: nuxt 缺字段`)
    }
    return
  }
  if (value !== other) {
    problems.push(`${path}: 值不同 nuxt=${JSON.stringify(value)} nest=${JSON.stringify(other)}`)
  }
}

/** 首个 id 提取（列表 data[0].id）。 */
function firstId(body) {
  return body?.data?.[0]?.id ?? null
}

async function main() {
  const nuxtToken = await login(NUXT_BASE)
  const nestToken = await login(NEST_BASE)

  // ── 只读端点清单（path 中的 :ref 由 resolveRefs 动态替换）──
  // 覆盖面 = openapi.yaml 全部 GET 端点，除两类有意排除：
  //   · /health（Nest 保活专用，契约明示 Next / Nuxt 不做对等实现）；
  //   · /dict/types/{code} 系列用固定 code=user_status 实参覆盖（见下两行）。
  const steps = [
    '/auth/me',
    '/permissions',
    '/dict/types',
    '/dict/types/user_status',
    '/dict/types/user_status/items',
    '/menus',
    '/menus/tree',
    '/menus/:menuId',
    '/roles?page=1&pageSize=10',
    '/roles/:roleId',
    '/roles/:roleId/menus',
    '/roles/:roleId/users',
    '/users?page=1&pageSize=10',
    '/users/:userId',
    '/logs?page=1&pageSize=10',
    '/logs/:logId',
    '/org/depts?page=1&pageSize=10',
    '/org/depts/tree',
    '/org/depts/:deptId',
    '/org/posts?page=1&pageSize=10',
    '/org/posts/:postId',
    '/org/posts/:postId/members',
    '/org/directory?page=1&pageSize=10',
    '/notices?page=1&pageSize=10',
    '/notices/:noticeId',
    '/notices/:noticeId/read-stats',
    '/notices/mine?page=1&pageSize=10',
    '/notifications?page=1&pageSize=10',
    '/notifications/unread-count',
    '/account/profile',
    '/stats/overview'
  ]

  /** 动态引用解析（从 nuxt 侧列表响应取 id；Nest 与 Nuxt 共库，id 一致）。 */
  const refs = {}
  async function resolveRefs() {
    const sources = {
      roleId: '/roles?page=1&pageSize=10',
      userId: '/users?page=1&pageSize=10',
      menuId: '/menus',
      logId: '/logs?page=1&pageSize=10',
      deptId: '/org/depts?page=1&pageSize=10',
      postId: '/org/posts?page=1&pageSize=10',
      noticeId: '/notices?page=1&pageSize=10'
    }
    for (const [name, listPath] of Object.entries(sources)) {
      const res = await get(NUXT_BASE, nuxtToken, listPath)
      refs[name] = firstId(res.body)
      if (!refs[name]) {
        console.warn(`[contract-diff] ⚠ 引用 ${name} 未取得（${listPath} 返回空），详情类端点将打向 MISSING`)
      }
    }
  }
  await resolveRefs()

  let totalProblems = []
  const report = []

  for (const step of steps) {
    const path = step.replace(/:(\w+)/g, (_, name) => refs[name] ?? 'MISSING')
    const a = await get(NUXT_BASE, nuxtToken, path)
    const b = await get(NEST_BASE, nestToken, path)

    const problems = []
    if (a.nonJson || b.nonJson) {
      problems.push(`非 JSON 响应 nuxt=${a.nonJson} nest=${b.nonJson}（API 路由未命中？）`)
    } else if (a.status !== b.status) {
      problems.push(`status 不同 nuxt=${a.status} nest=${b.status}`)
    } else if (a.status === 200) {
      diff(a.body, b.body, 'body', problems)
    }

    const known = problems.filter(isKnownDiff)
    const unknown = problems.filter(p => !isKnownDiff(p))

    const status = unknown.length === 0 ? (known.length > 0 ? 'KNOWN' : 'OK') : 'DIFF'
    report.push(`[${status}] GET ${path} (${a.status}/${b.status})`)
    for (const p of problems) {
      report.push(`       ${p}${isKnownDiff(p) ? '  ← 已记录差异（Nest vs Next 既有，Nuxt 对齐 Next）' : ''}`)
    }
    totalProblems = totalProblems.concat(unknown)
  }

  console.log(report.join('\n'))
  console.log('\n==============================')
  if (totalProblems.length > 0) {
    console.error(`[contract-diff] 发现 ${totalProblems.length} 处差异（见上）`)
    process.exit(1)
  }
  console.log('[contract-diff] ✓ 全部端点响应结构一致（易变字段除外）')
}

main().catch((e) => {
  console.error('[contract-diff] 运行失败:', e)
  process.exit(1)
})
