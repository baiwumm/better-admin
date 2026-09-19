/**
 * Dashboard 图表几何工具（纯函数）。
 *
 * Vue 端 Nuxt UI v4 不自带图表组件（v3 的 Chart* 已随版本移除，引入需要
 * chart.js —— 违背 AGENTS §15「不擅自引入依赖」），故两处图表与 KPI 迷你
 * 折线一律内联 SVG 手写，与 React 端 KpiCard 的 sparkline 同一口径
 * （React 端 sparkline 本就不依赖 recharts）。
 */

export interface ChartPoint {
  x: number;
  y: number;
}

/** 绘图区矩形（含坐标轴留白后的可用画布） */
export interface PlotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 纵轴等分数（刻度线含 0 与顶值共 5 条） */
export const AXIS_DIVISIONS = 4;

/**
 * 纵轴量程：步长向上取整，保证每一档刻度都是整数（登录次数为计数值，
 * 不接受 recharts 那种「好看数」——它会把量程抬到 40 / 80，数据只占半高）。
 */
export function axisScale(maxValue: number): { step: number; top: number } {
  const step = Math.max(1, Math.ceil(maxValue / AXIS_DIVISIONS));

  return { step, top: step * AXIS_DIVISIONS };
}

/**
 * 序列值 → 绘图区坐标（0 基线 + 轴量程归一，面积图自底部生长，
 * 与 recharts AreaChart 的 domain [0, top] 同口径）。
 */
export function zeroBasedPoints(
  values: number[],
  box: PlotBox,
  top: number,
): ChartPoint[] {
  const stepX = values.length > 1 ? box.width / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: box.x + index * stepX,
    y: box.y + box.height - (value / top) * box.height,
  }));
}

/**
 * 序列值 → 绘图区坐标（按序列自身 min/max 归一）。
 * 迷你 sparkline 专用：只表达相对起伏，绝对量级由卡片大数字承担。
 */
export function relativePoints(values: number[], box: PlotBox): ChartPoint[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? box.width / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: box.x + index * stepX,
    y: box.y + box.height - ((value - min) / span) * box.height,
  }));
}

/** Catmull-Rom → 三次贝塞尔平滑折线（与 React 端 kpi-card 同款，相邻切线取中点控制、无过冲） */
export function smoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return "";
  const at = (index: number) =>
    points[Math.min(Math.max(index, 0), points.length - 1)];
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = at(index - 1);
    const p1 = at(index);
    const p2 = at(index + 1);
    const p3 = at(index + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

/** 闭合到基线形成面积（面积图填充与 sparkline 渐变带共用） */
export function areaPath(
  linePath: string,
  points: ChartPoint[],
  baselineY: number,
): string {
  if (!linePath) return "";

  const last = points[points.length - 1];
  const first = points[0];

  return `${linePath} L${last.x.toFixed(2)},${baselineY.toFixed(2)} L${first.x.toFixed(2)},${baselineY.toFixed(2)} Z`;
}

/**
 * 环形扇区路径（角度制：0° 指向 12 点方向、顺时针增长）。
 * padDeg 为扇区间缝隙角（对齐 React 端 recharts paddingAngle={2}），
 * 缝隙按半角从两端各让出，相邻扇区不粘连。
 */
export function donutSlicePath(
  startDeg: number,
  endDeg: number,
  outerRadius: number,
  innerRadius: number,
  cx: number,
  cy: number,
  padDeg = 0,
): string {
  const from = startDeg + padDeg / 2;
  const to = endDeg - padDeg / 2;

  if (to <= from) return "";

  const at = (angle: number, radius: number) => {
    const radian = ((angle - 90) * Math.PI) / 180;

    return {
      x: cx + radius * Math.cos(radian),
      y: cy + radius * Math.sin(radian),
    };
  };

  const sweep = to - from;
  const largeArc = sweep > 180 ? 1 : 0;
  const outerStart = at(from, outerRadius);
  const outerEnd = at(to, outerRadius);
  const innerEnd = at(to, innerRadius);
  const innerStart = at(from, innerRadius);

  return [
    `M${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
    `A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
    `L${innerEnd.x.toFixed(2)},${innerEnd.y.toFixed(2)}`,
    `A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)},${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}
