/**
 * 语言包跨端同步检查（Nuxt 端入口，平移自 react 端同名脚本）。
 *
 * 对比 react/src/i18n/locales/ 与 nuxt/i18n/locales/ 的目录结构与全部
 * JSON 键值：文件缺失、键缺失、值不同都算差异，输出差异报告并以非零
 * 退出码失败——强制开发者同步语言包后才能合并。
 *
 * Nuxt 特有：sync-locales 会把裸 `@` 转义为 `{'@'}`（vue-i18n linked
 * 语法规避），值对比前先做归一化（还原 `{'@'}` → `@`）再与 React 源比对。
 *
 * 用法：node scripts/check-locales.mjs。本脚本保持自包含、无依赖。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const REACT_ROOT = join(scriptDir, '..', '..', 'react', 'src', 'i18n', 'locales')
const NUXT_ROOT = join(scriptDir, '..', 'i18n', 'locales')

/** 递归收集相对路径下的 JSON 文件（按语言目录分组的 key-value map）。 */
function collectLocales(root) {
  const result = {}

  for (const lang of readdirSync(root, { withFileTypes: true })) {
    if (!lang.isDirectory()) continue
    const langDir = join(root, lang.name)

    for (const file of readdirSync(langDir)) {
      if (!file.endsWith('.json')) continue
      const content = readFileSync(join(langDir, file), 'utf8')

      result[`${lang.name}/${file}`] = JSON.parse(content)
    }
  }

  return result
}

/** 深度收集 JSON 叶子路径 → 值。 */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}${key}` : key

    if (value && typeof value === 'object') {
      flatten(value, path, out)
    } else {
      out.set(path, value)
    }
  }

  return out
}

/** Nuxt 侧值归一化：还原 sync-locales 的 `{'@'}` 转义为裸 `@`。 */
function unescapeAt(value) {
  return typeof value === 'string'
    ? value.replaceAll('{\'@\'}', '@')
    : value
}

function main() {
  if (!existsSync(REACT_ROOT)) {
    console.error(`[check-locales] 找不到 React 端语言包目录：${REACT_ROOT}`)
    process.exit(1)
  }

  const react = collectLocales(REACT_ROOT)
  const nuxt = collectLocales(NUXT_ROOT)
  const problems = []

  // ── 文件集合差异 ──
  const reactFiles = Object.keys(react).sort()
  const nuxtFiles = Object.keys(nuxt).sort()

  for (const f of reactFiles) {
    if (!nuxtFiles.includes(f)) problems.push(`[缺失文件] nuxt 缺少 i18n/locales/${f}`)
  }
  for (const f of nuxtFiles) {
    if (!reactFiles.includes(f)) problems.push(`[多余文件] nuxt 多出 i18n/locales/${f}（React 端不存在）`)
  }

  // ── 键值差异 ──
  for (const f of reactFiles.filter(f => nuxtFiles.includes(f))) {
    const reactMap = flatten(react[f])
    const nuxtMap = flatten(nuxt[f])

    for (const [key, value] of reactMap) {
      if (!nuxtMap.has(key)) {
        problems.push(`[缺 key] ${f} 缺少 "${key}"`)
      } else if (unescapeAt(nuxtMap.get(key)) !== value) {
        problems.push(`[值不同] ${f} "${key}"：react="${value}" nuxt="${nuxtMap.get(key)}"`)
      }
    }

    for (const key of nuxtMap.keys()) {
      if (!reactMap.has(key)) problems.push(`[多 key] ${f} 多出 "${key}"`)
    }
  }

  if (problems.length > 0) {
    console.error(`[check-locales] 语言包与 React 端存在 ${problems.length} 处差异：\n`)
    for (const p of problems) console.error(`  ${p}`)
    console.error(
      `\n请先运行 node scripts/sync-locales.mjs 同步语言包后重试。`
    )
    process.exit(1)
  }

  console.log(
    `[check-locales] ✓ 语言包与 React 端完全一致（${reactFiles.length} 个文件：${reactFiles.join('、')}）`
  )
}

main()
