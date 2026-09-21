/**
 * 加载动效变体清单（与 `Loader.vue` 的渲染分支一一对应）。
 *
 * `satisfies` 把「联合类型 ↔ 数组」锁死为双向漂移即编译期报错
 * （对齐 React 端 `loaders-page.tsx` 的同款约束）；类型单独成文件是因为
 * `<script setup>` 不能有 export 语句，而页面与组件两侧都要消费它。
 */
export type LoaderVariant =
  | "spinner"
  | "dots"
  | "bars"
  | "dot-matrix"
  | "dither"
  | "ascii"
  | "ascii-line"
  | "ascii-braille"
  | "ascii-blocks"
  | "ascii-bounce"
  | "morph"
  | "comet"
  | "scramble"
  | "metaballs"
  | "newton"
  | "helix"
  | "percent";

export const LOADER_VARIANTS = [
  "spinner",
  "dots",
  "bars",
  "dot-matrix",
  "dither",
  "morph",
  "comet",
  "scramble",
  "metaballs",
  "newton",
  "helix",
  "percent",
  "ascii",
  "ascii-line",
  "ascii-braille",
  "ascii-blocks",
  "ascii-bounce",
] as const satisfies readonly LoaderVariant[];
