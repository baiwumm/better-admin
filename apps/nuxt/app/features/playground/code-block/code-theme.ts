/**
 * 代码块高亮主题：从单一 accent hex 派生整套配色（逻辑逐字移植自 rare-ui `code-block`，MIT）。
 * 返回容器 CSS 变量用色 + token 类型 → 内联样式映射。
 */

export type ThemeMode = 'dark' | 'light'

const FALLBACK_HSL: [number, number, number] = [211, 100, 52]

function hexToHsl(hex: string): [number, number, number] {
  if (typeof hex !== 'string') return FALLBACK_HSL
  let value = hex.replace('#', '')

  if (value.length === 4 || value.length === 8) {
    value = value.slice(0, value.length === 4 ? 3 : 6)
  }
  if (value.length === 3) {
    value = value
      .split('')
      .map(c => c + c)
      .join('')
  }
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255

  if (value.length !== 6 || [r, g, b].some(Number.isNaN)) return FALLBACK_HSL

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    default:
      h = ((r - g) / d + 4) / 6
  }

  return [h * 360, s * 100, l * 100]
}

const hsl = (h: number, s: number, l: number, a = 1) => {
  const hue = ((h % 360) + 360) % 360

  return a === 1
    ? `hsl(${hue.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`
    : `hsl(${hue.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`
}

export type TokenStyle = { color?: string, fontStyle?: string }

type ThemeEntry = { types: string[], style: TokenStyle }

export type CodeTheme = {
  colors: {
    accent: string
    bg: string
    border: string
    headerBg: string
    plain: string
    muted: string
    gutter: string
    hoverWash: string
    floatBg: string
    selection: string
    lineWash: string
  }
  styles: ThemeEntry[]
}

export function buildTheme(
  accent: string,
  mode: ThemeMode = 'dark'
): CodeTheme {
  const [h, s, l] = hexToHsl(accent)
  const tint = (lightness: number, sat = s) => hsl(h, sat, lightness)
  const dark = mode !== 'light'
  const accentTone = dark
    ? tint(Math.min(Math.max(l, 56), 70))
    : tint(Math.min(Math.max(l, 38), 50))
  // 浅色模式只是把亮度坡道翻转
  const ramp = (lightness: number) => (dark ? lightness : 100 - lightness)

  const colors = dark
    ? {
        accent: accentTone,
        bg: 'oklch(0.1822 0 0)',
        border: 'rgb(255 255 255 / 0.08)',
        headerBg: 'rgb(255 255 255 / 0.03)',
        plain: '#ffffff',
        muted: 'rgb(255 255 255 / 0.6)',
        gutter: 'rgb(255 255 255 / 0.28)',
        hoverWash: 'rgb(255 255 255 / 0.08)',
        floatBg: 'rgb(255 255 255 / 0.05)',
        selection: hsl(h, s, 58, 0.3),
        lineWash: hsl(h, s, 58, 0.1)
      }
    : {
        accent: accentTone,
        bg: 'oklch(0.985 0 0)',
        border: 'rgb(0 0 0 / 0.08)',
        headerBg: 'rgb(0 0 0 / 0.03)',
        plain: '#171717',
        muted: 'rgb(0 0 0 / 0.6)',
        gutter: 'rgb(0 0 0 / 0.32)',
        hoverWash: 'rgb(0 0 0 / 0.06)',
        floatBg: 'rgb(0 0 0 / 0.04)',
        selection: hsl(h, s, 45, 0.25),
        lineWash: hsl(h, s, 45, 0.08)
      }

  const styles: ThemeEntry[] = [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: tint(ramp(42), s * 0.35), fontStyle: 'italic' }
    },
    { types: ['punctuation'], style: { color: tint(ramp(62), s * 0.3) } },
    {
      types: ['operator', 'combinator'],
      style: { color: tint(ramp(70), s * 0.4) }
    },
    {
      types: ['keyword', 'selector', 'atrule', 'important', 'tag'],
      style: { color: accentTone }
    },
    {
      types: ['string', 'char', 'inserted', 'url'],
      style: { color: tint(ramp(76)) }
    },
    { types: ['function'], style: { color: tint(ramp(88), s * 0.5) } },
    {
      types: ['attr-name'],
      style: { color: tint(ramp(78), s * 0.7), fontStyle: 'italic' }
    },
    {
      types: ['number', 'boolean', 'constant', 'symbol', 'deleted'],
      style: { color: tint(ramp(70)) }
    },
    {
      types: ['class-name', 'maybe-class-name', 'builtin'],
      style: { color: tint(ramp(93), s * 0.35) }
    },
    {
      types: ['property', 'variable', 'parameter'],
      style: { color: tint(ramp(97), s * 0.15) }
    },
    { types: ['regex'], style: { color: tint(ramp(72), s * 0.6) } }
  ]

  return { colors, styles }
}

/** 按 token 类型链合并主题样式（后匹配项覆盖前者，与 prism-react-renderer 的 themeToDict 语义一致）。 */
export function styleForTypes(
  theme: CodeTheme,
  types: string[]
): TokenStyle | undefined {
  let merged: TokenStyle | undefined

  for (const entry of theme.styles) {
    if (!entry.types.some(type => types.includes(type))) continue
    merged = { ...merged, ...entry.style }
  }

  return merged
}
