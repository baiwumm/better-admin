"use client";

import type { StatsRoleSlice } from "@/lib/api-types";
import type { MouseEvent as ReactMouseEvent } from "react";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Typography } from "@heroui/react";
import { useRef, useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 角色占比环形图（plan §4.2 副图 1）：Recharts donut + 品牌色相轮转分类色图例
 * （全部由 --accent 派生，不新增色值，四端以同一色相标度对齐）。
 *
 * Tooltip 自绘、且**由容器单条 mousemove 驱动**——不用 recharts 的 `<Tooltip>`，
 * 也不用扇区自己的 enter/leave，原因见下方 hover 段注释。
 *
 * 以默认导出经 React.lazy 分包加载。
 */

interface RoleDistributionChartProps {
  slices: StatsRoleSlice[];
}

/**
 * 分类色标度：以 --accent 为锚做色相轮转，明度沿用品牌值、彩度统一取品牌彩度
 * 的 0.72 倍（六段循环）。
 *
 * 替换掉原先的「主色透明度阶梯」——alpha 混合是往背后的卡片色里融，浅色卡片上
 * 还读得出深浅，深色卡片上低 alpha 的扇区几乎与底色同化，标度本身在深色模式不
 * 成立；相邻扇区难分辨只是表症。固定 L/C 的色相轮转在两种主题下感知距离一致，
 * 且每个颜色仍是品牌色本身（oklch 相对色彩语法，项目 sign-in.css 已在用），
 * 未新增任何色值（AGENTS §7.3）。彩度降到 0.72 倍是为把暖端色相留在 sRGB 域内
 * 并让整组更克制，与 plan §4.1 的克制式高级感一致。
 */
const SLICE_HUE_OFFSETS = [0, 42, -42, 84, -84, 126];

/** 第 i 个扇区填充色：仅改色相与彩度，明度与品牌色一致 */
function sliceFill(i: number): string {
  const offset = SLICE_HUE_OFFSETS[i % SLICE_HUE_OFFSETS.length];
  const sign = offset < 0 ? "-" : "+";

  return `oklch(from var(--accent) l calc(c * 0.72) calc(h ${sign} ${Math.abs(offset)}))`;
}

/** Tooltip 相对指针的偏移，避免压在光标正下方 */
const TIP_OFFSET = 14;

/**
 * recharts 标在扇区节点上的数据索引属性（util/Constants.js）。
 * Sector 渲染时走 svgPropertiesAndEvents 过滤，该过滤器显式保留 data-* 属性，
 * 所以它会出现在 .recharts-sector 的 <path> 上——命中判定就靠反查它。
 */
const ITEM_INDEX_ATTR = "data-recharts-item-index";

export default function RoleDistributionChart({
  slices,
}: RoleDistributionChartProps) {
  const { t } = useTranslation();
  const data = slices.map((s, i) => ({ ...s, fill: sliceFill(i) }));
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  const boxRef = useRef<HTMLDivElement>(null);
  /** 当前命中扇区；null = 不在任何扇区上。Tooltip 靠它淡出，元素本身不卸载 */
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  /** 淡出期间仍渲染上一份内容，否则玻璃盒会先塌成一条内边距 */
  const [lastIndex, setLastIndex] = useState(0);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  /**
   * 为什么绕开 recharts 的 <Tooltip>：它给每个扇区各挂一对 enter/leave
   * （Pie.js），离开 A 会 dispatch mouseLeaveItem 把 active 置 false 并清空
   * coordinate，外层 transform 于是归零回容器左上角，进入 B 再置回 true。
   * 结果开位置动画 = 每次从左上角飞入、关位置动画 = 闪一下，两种都不对。
   *
   * 而直接借用它那对扇区事件也不可靠：实测扇区自己的 mouseleave 会丢
   * （activeIndex 一变，recharts 就把所有扇区的 shape 换成 inactiveShapeProp，
   * 子树被替换，指针下的节点已不是当初 enter 的那个，leave 事件发不出来），
   * 表现为 Tooltip 卡在图上不走。
   *
   * 登录趋势那张图之所以没问题，是因为轴类图表用**一条连续 mousemove** 更新
   * axis index，中途从不 deactivate。这里把环形图改成同一模型：只监听容器
   * mousemove，用命中节点上的 data-recharts-item-index 反查扇区。命中即显示，
   * 未命中（圆心空洞 / 环外 / 移出容器）即淡出——单一事件源，没有 enter/leave
   * 竞态，也不依赖 rAF 之类的异步回调。
   */
  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();

    if (box) {
      setTipPos({ x: event.clientX - box.left, y: event.clientY - box.top });
    }

    const hit = (event.target as Element)
      .closest?.(`[${ITEM_INDEX_ATTR}]`)
      ?.getAttribute(ITEM_INDEX_ATTR);
    const index = hit === undefined || hit === null ? null : Number(hit);

    if (index === null || !Number.isFinite(index)) {
      setHoverIndex(null);

      return;
    }

    setLastIndex(index);
    setHoverIndex(index);
  };

  const shown = data[hoverIndex ?? lastIndex];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 环形空心处放成员总数：卡片与左图等高时中心不再是空洞，空心即信息区 */}
      <div
        ref={boxRef}
        className="relative min-h-40 w-full flex-1"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={handleMouseMove}
      >
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              innerRadius="68%"
              nameKey="roleName"
              outerRadius="88%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.roleCode} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center">
            <span
              className="text-2xl font-semibold tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {total}
            </span>
            <Typography color="muted" type="body-xs">
              {t("features.dashboard.chart.totalMembers")}
            </Typography>
          </div>
        </div>
        {/* 常驻不卸载：只切 data-visible 的透明度，扇区间切换不闪、移出后淡出 */}
        <div
          className="dashboard-chart-tooltip dashboard-hover-tooltip"
          data-visible={hoverIndex !== null}
          style={{
            transform: `translate(${tipPos.x + TIP_OFFSET}px, ${tipPos.y + TIP_OFFSET}px)`,
          }}
        >
          <Typography className="text-xs" color="muted">
            {shown?.roleName}
          </Typography>
          <Typography className="text-xs font-semibold tabular-nums">
            {t("features.dashboard.chart.members")}：{shown?.count}
          </Typography>
        </div>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <li
            key={entry.roleCode}
            className="flex items-center gap-1.5 text-xs"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: entry.fill }}
            />
            <span
              className="whitespace-nowrap"
              style={{ color: "var(--foreground)" }}
            >
              {entry.roleName}
            </span>
            <span
              className="shrink-0 text-xs tabular-nums"
              style={{ color: "var(--muted)" }}
            >
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
