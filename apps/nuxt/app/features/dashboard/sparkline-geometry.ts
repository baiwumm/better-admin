/**
 * KPI 迷你 sparkline 几何工具（纯函数）。
 *
 * React / Vue 端 KpiCard 的 sparkline 本就是手写内联 SVG（不依赖图表库），
 * Nuxt 端同一口径：登录趋势主图与角色环形图用 nuxt-charts，唯 sparkline
 * 保持手写，与两端共用同一套曲线算法（Catmull-Rom → 三次贝塞尔平滑）。
 */

export interface ChartPoint {
  x: number
  y: number
}

/** 绘图区矩形（含留白后的可用画布） */
export interface PlotBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 序列值 → 绘图区坐标（按序列自身 min/max 归一）。
 * 迷你 sparkline 专用：只表达相对起伏，绝对量级由卡片大数字承担。
 */
export function relativePoints(values: number[], box: PlotBox): ChartPoint[] {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const stepX = values.length > 1 ? box.width / (values.length - 1) : 0

  return values.map((value, index) => ({
    x: box.x + index * stepX,
    y: box.y + box.height - ((value - min) / span) * box.height
  }))
}

/** Catmull-Rom → 三次贝塞尔平滑折线（与 React 端 kpi-card 同款，相邻切线取中点控制、无过冲） */
export function smoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return ''
  const at = (index: number) =>
    points[Math.min(Math.max(index, 0), points.length - 1)]
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = at(index - 1)
    const p1 = at(index)
    const p2 = at(index + 1)
    const p3 = at(index + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  return d
}

/** 闭合到基线形成面积（sparkline 渐变带） */
export function areaPath(
  linePath: string,
  points: ChartPoint[],
  baselineY: number
): string {
  if (!linePath) return ''

  const last = points[points.length - 1]
  const first = points[0]

  return `${linePath} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`
}
