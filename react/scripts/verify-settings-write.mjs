import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext()
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded' })
await page.getByRole('textbox', { name: /用户名/i }).fill('admin')
await page.getByLabel(/密码/i).fill('admin123')
await page.getByRole('button', { name: /登录/i }).click()
await page.waitForURL((u) => !u.pathname.includes('sign-in'), { timeout: 15000 })
await page.waitForTimeout(800)

await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' })
// 等待设置数据渲染
await page.getByText('site.title').first().waitFor({ timeout: 15000 })

// 基本设置分组：定位 site.title 行（字符串类型输入框）
const titleRow = page.locator('div.rounded-lg.border.p-4').filter({ hasText: 'site.title' })
await titleRow.first().waitFor({ timeout: 8000 })
const input = titleRow.locator('input')
await input.first().waitFor({ timeout: 8000 })
const before = await input.inputValue()
console.log('修改前 site.title =', before)

const testValue = 'Better Admin - 联调写入测试'
await input.fill(testValue)
await input.press('Enter') // 兜底：同表单提交无冲突时直接点击行内按钮
await titleRow.locator('button').filter({ hasText: '保存' }).click()
await page.waitForTimeout(1500)
let writeOk = false
try {
  await page.getByText('设置 site.title 更新成功').waitFor({ timeout: 8000 })
  writeOk = true
} catch {
  writeOk = false
}
console.log('UI 写入成功:', writeOk)

// 恢复原值（API）
const restored = await page.evaluate(async (orig) => {
  const token = localStorage.getItem('accessToken')
  const res = await fetch('http://localhost:3000/api/settings/site.title', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value: orig }),
  })
  return res.status
}, before)
console.log('恢复原值 HTTP:', restored)
if (errors.length) console.log('页面错误:', errors.slice(0, 3))
await browser.close()
process.exit(writeOk ? 0 : 1)