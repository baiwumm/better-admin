import { describe, expect, it } from 'vitest'

import { areaPath, relativePoints, smoothPath } from '../sparkline-geometry'

/**
 * KPI sparkline 几何纯函数测试（平移自 Vue 端 chart-geometry 同名用例的
 * sparkline 子集；主图 / 环形图的几何由 nuxt-charts 承担，不在本端测试面内）。
 */

const BOX = { x: 0, y: 0, width: 100, height: 40 }

describe('relativePoints', () => {
  it('按序列自身 min/max 归一：最小值贴底、最大值贴顶、横等分', () => {
    const points = relativePoints([2, 6, 10], BOX)

    expect(points).toEqual([
      { x: 0, y: 40 },
      { x: 50, y: 20 },
      { x: 100, y: 0 }
    ])
  })

  it('全平序列（max=min）不除零，落在绘图区底边', () => {
    expect(relativePoints([5, 5], BOX)).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 40 }
    ])
  })
})

describe('smoothPath / areaPath', () => {
  it('少于两点不成线（单点卡不画趋势带）', () => {
    expect(smoothPath([{ x: 0, y: 0 }])).toBe('')
    expect(areaPath('', [{ x: 0, y: 0 }], 40)).toBe('')
  })

  it('首段为 M、其余为三次贝塞尔，面积闭合回基线两端', () => {
    const points = relativePoints([2, 6, 10], BOX)
    const line = smoothPath(points)

    expect(line.startsWith('M0.00,40.00 C')).toBe(true)
    expect(line.match(/C/g)).toHaveLength(2)
    expect(
      areaPath(line, points, 40).endsWith('L100.00,40.00 L0.00,40.00 Z')
    ).toBe(true)
  })
})
