import type { ReactNode } from "react";

/**
 * 错误页极简线稿插画（背景装饰层）：单色线条，颜色跟随 tone 色、50% 透明度，
 * 与状态码情绪匹配——403 精致小锁 / 404 失焦指南针 / 500 破碎齿轮。
 * 纯装饰（aria-hidden 由根 svg 标注），未匹配的状态码不渲染。
 */

interface ErrorPageGlyphProps {
  status: string;
  className?: string;
}

const GLYPH_SVG_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
  viewBox: "0 0 120 120",
} as const;

const GLYPHS: Record<string, ReactNode> = {
  // 精致小锁：锁体 + 提梁 + 锁孔
  "403": (
    <>
      <rect height="36" rx="9" width="48" x="36" y="56" />
      <path d="M45 56v-9a15 15 0 0 1 30 0v9" />
      <circle cx="60" cy="70" r="3.5" />
      <path d="M60 73.5V81" />
    </>
  ),
  // 失焦指南针：外环虚线示意失焦，内环表盘 + 指针 + 刻度
  "404": (
    <>
      <circle cx="60" cy="60" r="36" strokeDasharray="3 7" />
      <circle cx="60" cy="60" r="27" />
      <path d="M72 48l-8 16-16 8 8-16z" />
      <path d="M60 33v5M60 82v5M33 60h5M82 60h5" />
    </>
  ),
  // 破碎齿轮：内外圈 + 8 齿，裂纹贯穿示意「破碎」
  "500": (
    <>
      <circle cx="60" cy="60" r="21" />
      <circle cx="60" cy="60" r="8" />
      <path d="M60 39v-9M60 90v-9M39 60h-9M90 60h-9M45.4 45.4l-6.4-6.4M81 81l-6.4-6.4M45.4 74.6l-6.4 6.4M81 39l-6.4 6.4" />
      <path d="M52 41l7 10-9 7 10 9-3 13" />
    </>
  ),
};

export function ErrorPageGlyph({ status, className }: ErrorPageGlyphProps) {
  const glyph = GLYPHS[status];

  if (!glyph) return null;

  return (
    <svg {...GLYPH_SVG_PROPS} aria-hidden className={className}>
      {glyph}
    </svg>
  );
}
