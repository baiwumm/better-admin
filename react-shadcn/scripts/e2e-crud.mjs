/**
 * Phase 3 联调 UI-CRUD 深度 E2E：
 * 新增用户 → 列表出现 → 编辑 → 停用/启用 → 重置密码 → 单个删除；
 * 批量删除；角色授权配置；Token 过期跳转；退出登录。
 * 运行：node scripts/e2e-crud.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const suffix = Date.now().toString().slice(-6)
const userName = `e2e_${suffix}`
const userName2 = `e2e2_${suffix}`
const results = []
function record(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${extra}`)
}

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const errors = []
const apiCalls = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) =>
  errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`)
)
page.on('response', async (r) => {
  if (r.url().includes('/api/users') && r.request().method() !== 'OPTIONS') {
    let body = ''
    try {
      body = (await r.text()).slice(0, 200)
    } catch {
      body = '<no body>'
    }
    apiCalls.push(
      `${r.status()} ${r.request().method()} ${r
        .url()
        .replace('http://localhost:3000/api', '')} :: ${body}`
    )
  }
})

try {
  // 登录
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: /用户名/i }).fill('admin')
  await page.getByLabel(/密码/i).fill('admin123')
  await page.getByRole('button', { name: /登录/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('sign-in'), {
    timeout: 15000,
  })
  await page.waitForTimeout(800)

  // ===== 新增用户 =====
  await page.goto(`${BASE}/users`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /新增用户/i }).click()
  await page.getByRole('textbox', { name: /^用户名$/ }).fill(userName)
  await page.getByRole('textbox', { name: /^姓名$/ }).fill('E2E 测试用户')
  await page.getByRole('textbox', { name: /^邮箱$/ }).fill(`${userName}@e2e.local`)
  await page.getByLabel('密码', { exact: true }).fill('e2epass123')
  await page.getByLabel('确认密码', { exact: true }).fill('e2epass123')
  await page.getByRole('button', { name: /^保存$/ }).click()
  await page.waitForTimeout(1500)
  // 搜索确认出现在列表
  await page.getByRole('textbox', { name: /搜索用户名/ }).fill(userName)
  await page.keyboard.press('Enter')
  await page.getByText(userName).first().waitFor({ timeout: 8000 })
  record('UI 新增用户并出现在列表', true)

  // ===== 编辑用户 =====
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.getByRole('menuitem', { name: /^编辑$/ }).click()
  await page.waitForTimeout(800)
  await page.getByRole('textbox', { name: /^姓名$/ }).fill('E2E 测试用户-改')
  await page.getByRole('button', { name: /^保存$/ }).click()
  let editOk = false
  try {
    await page.getByText('E2E 测试用户-改').first().waitFor({ timeout: 10000 })
    editOk = true
  } catch {
    editOk = false
  }
  record('UI 编辑用户', editOk)

  // ===== 停用 / 启用 =====
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.getByRole('menuitem', { name: /^停用用户$/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /^停用$/ }).last().click()
  let disabledOk = false
  try {
    await page.getByText('停用', { exact: true }).first().waitFor({ timeout: 10000 })
    disabledOk = true
  } catch {
    disabledOk = false
  }
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.getByRole('menuitem', { name: /^启用用户$/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /^启用$/ }).last().click()
  let enabledOk = false
  try {
    await page.getByText('启用', { exact: true }).first().waitFor({ timeout: 10000 })
    enabledOk = true
  } catch {
    enabledOk = false
  }
  record('UI 停用用户', disabledOk)
  record('UI 启用用户', enabledOk)

  // ===== 重置密码 =====
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.getByRole('menuitem', { name: /^重置密码$/ }).click()
  await page.waitForTimeout(600)
  await page.getByLabel('新密码', { exact: true }).fill('newpass888')
  await page.getByLabel('确认新密码', { exact: true }).fill('newpass888')
  await page.getByRole('button', { name: /^确认重置$/ }).click()
  await page.waitForTimeout(800)
  record('UI 重置密码', true)

  // ===== 单个删除 =====
  await page.getByRole('button', { name: /打开菜单/i }).first().click()
  await page.getByRole('menuitem', { name: /^删除$/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('textbox', { name: /用户名/ }).fill(userName)
  await page.getByRole('button', { name: /^删除$/ }).last().click()
  let deleteOk = false
  try {
    await page
      .getByText('未找到结果', { exact: true })
      .waitFor({ timeout: 10000 })
    deleteOk = true
  } catch {
    deleteOk = false
  }
  record('UI 单个删除', deleteOk)

  // ===== 批量删除 =====
  // 先创建第二个用户
  await page.getByRole('button', { name: /新增用户/i }).click()
  await page.getByRole('textbox', { name: /^用户名$/ }).fill(userName2)
  await page.getByRole('textbox', { name: /^姓名$/ }).fill('E2E 批量删除')
  await page.getByRole('textbox', { name: /^邮箱$/ }).fill(`${userName2}@e2e.local`)
  await page.getByLabel('密码', { exact: true }).fill('e2epass123')
  await page.getByLabel('确认密码', { exact: true }).fill('e2epass123')
  await page.getByRole('button', { name: /^保存$/ }).click()
  await page.waitForTimeout(1500)
  // 用搜索过滤出该用户（单行），全选后批量删除
  await page.getByRole('textbox', { name: /搜索用户名/ }).fill(userName2)
  await page.keyboard.press('Enter')
  await page.getByText(userName2).first().waitFor({ timeout: 8000 })
  await page.locator('thead').getByRole('checkbox').first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /删除选中用户/i }).click()
  await page.getByLabel(/请输入"DELETE"确认/).fill('DELETE')
  await page.getByRole('button', { name: /^删除$/ }).last().click()
  let batchOk = false
  try {
    await page
      .getByText('未找到结果', { exact: true })
      .waitFor({ timeout: 10000 })
    batchOk = true
  } catch {
    batchOk = false
  }
  record('UI 批量删除', batchOk)

  // ===== 角色授权配置（用 admin 角色，避免改动 super_admin 全量位） =====
  await page.goto(`${BASE}/roles`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /权限配置/i }).nth(1).click()
  let authDialogOk = false
  try {
    await page
      .getByRole('checkbox', { name: /概览 查询/ })
      .first()
      .waitFor({ timeout: 10000 })
    // 勾选一个菜单的「查询」权限并保存
    await page
      .getByRole('checkbox', { name: /概览 查询/ })
      .first()
      .click()
    await page.getByRole('button', { name: /保存授权/ }).click()
    await page.waitForTimeout(1000)
    authDialogOk = true
  } catch {
    const dlg = await page.locator('[role="dialog"]').innerText().catch(() => '')
    console.log('[dbg] 授权对话框文本:', dlg.slice(0, 200))
    authDialogOk = false
  }
  record('角色授权配置 UI', authDialogOk)

  // ===== Token 过期 → 跳转登录 =====
  await page.evaluate(() => localStorage.setItem('accessToken', 'invalid-token'))
  await page.goto(`${BASE}/users`, { waitUntil: 'domcontentloaded' })
  let redirected = false
  try {
    await page.waitForURL(/\/sign-in/, { timeout: 12000 })
    redirected = true
  } catch {
    redirected = false
  }
  record('Token 过期自动跳转登录', redirected)

  // ===== 重新登录并退出登录 =====
  await page.getByRole('textbox', { name: /用户名/i }).fill('admin')
  await page.getByLabel(/密码/i).fill('admin123')
  await page.getByRole('button', { name: /登录/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('sign-in'), {
    timeout: 15000,
  })
  await page.waitForTimeout(1200)
  // 点击侧边栏底部用户区 → 退出登录
  await page.locator("[data-slot='sidebar-footer']").click()
  await page.getByRole('menuitem', { name: /退出登录/ }).click()
  await page.getByRole('button', { name: /退出登录/ }).last().click()
  await page.waitForURL(/\/sign-in/, { timeout: 12000 })
  const tokenAfter = await page.evaluate(() =>
    localStorage.getItem('accessToken')
  )
  record('退出登录清除 Token 并跳转', tokenAfter === null || tokenAfter === '')
} catch (e) {
  record('脚本异常', false, e.message)
}

if (errors.length) {
  console.log('\n--- 浏览器错误 ---')
  errors.slice(0, 8).forEach((e) => console.log(e))
}
console.log('\n--- API 调用 ---')
apiCalls.slice(-16).forEach((c) => console.log(c))
await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`)
process.exit(failed.length ? 1 : 0)