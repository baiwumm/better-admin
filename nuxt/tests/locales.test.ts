import { describe, expect, it } from 'vitest'

import authEn from '../i18n/locales/en/auth.json'
import commonEn from '../i18n/locales/en/common.json'
import dictEn from '../i18n/locales/en/dict.json'
import errorsEn from '../i18n/locales/en/errors.json'
import featuresEn from '../i18n/locales/en/features.json'
import layoutEn from '../i18n/locales/en/layout.json'
import menuEn from '../i18n/locales/en/menu.json'
import authZh from '../i18n/locales/zh-CN/auth.json'
import commonZh from '../i18n/locales/zh-CN/common.json'
import dictZh from '../i18n/locales/zh-CN/dict.json'
import errorsZh from '../i18n/locales/zh-CN/errors.json'
import featuresZh from '../i18n/locales/zh-CN/features.json'
import layoutZh from '../i18n/locales/zh-CN/layout.json'
import menuZh from '../i18n/locales/zh-CN/menu.json'

/** 语言包文件与其域前缀（键为完整字面量形式，平移自 vue 端同名用例；
 * sync-locales.mjs 从 react 同步，@ 转义幂等，两语言键集合必须一致）。 */
const DOMAINS = [
  ['auth', authZh, authEn],
  ['common', commonZh, commonEn],
  ['dict', dictZh, dictEn],
  ['errors', errorsZh, errorsEn],
  ['features', featuresZh, featuresEn],
  ['layout', layoutZh, layoutEn],
  ['menu', menuZh, menuEn]
] as const

describe('i18n locales', () => {
  it('zh-CN 与 en 的 key 集合完全一致（逐域）', () => {
    for (const [domain, zh, en] of DOMAINS) {
      const zhKeys = Object.keys(zh).sort()
      const enKeys = Object.keys(en).sort()

      expect(zhKeys, `${domain} zh-CN 独有键`).toEqual(enKeys)
    }
  })

  it('所有键值均为非空字符串', () => {
    for (const [domain, zh, en] of DOMAINS) {
      for (const [key, value] of Object.entries(zh)) {
        expect(typeof value, `${domain}:${key} zh-CN 类型`).toBe('string')
        expect(value.length, `${domain}:${key} zh-CN 非空`).toBeGreaterThan(0)
      }
      for (const [key, value] of Object.entries(en)) {
        expect(typeof value, `${domain}:${key} en 类型`).toBe('string')
        expect(value.length, `${domain}:${key} en 非空`).toBeGreaterThan(0)
      }
    }
  })

  it('键均以所在域名为前缀（防止跨域拼接出错）', () => {
    for (const [domain, zh, en] of DOMAINS) {
      for (const key of Object.keys(zh)) {
        expect(key.startsWith(`${domain}.`), `${domain}:${key} 前缀`).toBe(
          true
        )
      }
      for (const key of Object.keys(en)) {
        expect(key.startsWith(`${domain}.`), `${domain}:${key} 前缀`).toBe(
          true
        )
      }
    }
  })
})
