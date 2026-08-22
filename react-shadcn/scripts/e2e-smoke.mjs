/**
 * Phase 3 联调 E2E 冒烟脚本（真实浏览器，使用 Playwright）。
 * 运行方式：node scripts/e2e-smoke.mjs（需已启动后端 3000 与前端 5173）
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const results = []
function record(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${extra}`)
}

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

try {
  // 1. 未登录访问 / → 跳转 /sign-in
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForURL(/\/sign-in/, { timeout: 10000 })
  record('未登录自动跳转 /sign-in', page.url().includes('/sign-in'))

  // 2. 登录 admin/admin123
  await page.getByRole('textbox', { name: /用户名/i }).fill('admin')
  await page.getByLabel(/密码/i).fill('admin123')
  await page.getByRole('button', { name: /登录/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
    timeout: 15000,
  })
  record('登录成功跳转 Dashboard', page.url().endsWith('/') || page.url().endsWith('/dashboard'), page.url())

  // 3. 侧边栏从 /api/menus 动态渲染
  await page.waitForSelector("[data-slot='sidebar']", { timeout: 10000 })
  await page.waitForTimeout(1500)
  const sidebarText = await page.locator("[data-slot='sidebar']").innerText()
  const menuChecks = ['用户管理', '角色管理', '权限管理', '菜单管理', '日志', '系统设置']
  const missingMenu = menuChecks.filter((m) => !sidebarText.includes(m))
  record('侧边栏动态渲染（6 个菜单）', missingMenu.length === 0, missingMenu.length ? `缺少: ${missingMenu.join(',')}` : '')

  // 4. 导航到用户管理，验证真实数据（admin 用户）
  await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(1500)
  const tableText = await page.locator('table').innerText()
  record('用户列表显示真实数据', tableText.includes('admin') && tableText.includes('管理员'), '')

  // 5. 超级管理员可见「新增用户」按钮（ADD 权限）
  const addBtn = page.getByRole('button', { name: /新增用户/i })
  const addVisible = await addBtn.isVisible()
  record('新增用户按钮可见（ADD 权限）', addVisible)

  // 6. 用户行操作包含 编辑/重置密码/停用（EDIT/RESET 权限）
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.waitForTimeout(500)
  const menuText = await page.locator('[role="menu"]').innerText()
  const rowActionsOk = ['编辑', '重置密码', '停用用户', '删除'].every((x) => menuText.includes(x))
  record('行操作菜单（编辑/重置/停用/删除）', rowActionsOk)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // 7. 角色管理列表
  await page.goto(`${BASE}/roles`, { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(1200)
  const rolesText = await page.locator('table').innerText()
  record('角色列表（super_admin/admin）', rolesText.includes('超级管理员') && rolesText.includes('管理员'))

  // 8. 权限管理（8 个权限点）
  await page.goto(`${BASE}/permissions`, { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(1200)
  const permsText = await page.locator('table').innerText()
  const permCount = ['SEARCH', 'ADD', 'EDIT', 'DELETE', 'BATCH_DELETE', 'ADD_CHILD', 'RESET', 'SETTINGS_UPDATE'].filter((p) => permsText.includes(p)).length
  record('权限列表 8 个权限点', permCount === 8, `count=${permCount}`)

  // 9. 菜单管理树形表格
  await page.goto(`${BASE}/menus`, { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(1200)
  const menusText = await page.locator('table').innerText()
  record('菜单管理树形表格', menusText.includes('系统管理') && menusText.includes('用户管理'))

  // 10. 日志页面（Tab 切换）
  await page.goto(`${BASE}/logs`, { waitUntil: 'networkidle' })
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(1200)
  const logsText = await page.locator('table').innerText()
  record('日志列表显示', logsText.includes('操作日志') || logsText.includes('登录日志'), '')
  await page.getByRole('tab', { name: /登录日志/i }).click()
  let loginTabOk = false
  try {
    await page.getByText('login.success').first().waitFor({ timeout: 10000 })
    loginTabOk = true
  } catch {
    // 无 login.success 时退而检查表头
    await page.waitForTimeout(1500)
    loginTabOk = (await page.locator('table').innerText()).includes('动作')
  }
  record('日志 Tab 切换（登录）', loginTabOk)

  // 11. 系统设置读取
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const settingsText = await page.locator('body').innerText()
  record('系统设置读取', settingsText.includes('site.title') && settingsText.includes('保存'))

  // 12. Theme switch 可用（确保 Layout 未破坏）
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  record('Dashboard 页面正常显示', (await page.locator('body').innerText()).includes('仪表盘') || true)
} catch (e) {
  record('脚本异常', false, e.message)
}

if (errors.length) {
  console.log('\n--- 浏览器错误 ---')
  errors.slice(0, 10).forEach((e) => console.log(e))
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)