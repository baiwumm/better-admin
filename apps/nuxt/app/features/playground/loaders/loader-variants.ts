/**
 * 加载动效变体清单（与 `Loader.vue` 的渲染分支一一对应），自 Vue 端同文件平移。
 *
 * `satisfies` 把「联合类型 ↔ 数组」锁死为双向漂移即编译期报错（对齐 React 端
 * `loaders-page.tsx` 的同款约束）；类型单独成文件是因为 `<script setup>` 不能有
 * export 语句，而组件与页面两侧都要消费它。
 */
export type LoaderVariant
  = | 'ascii'
    | 'ascii-blocks'
    | 'ascii-bounce'
    | 'ascii-braille'
    | 'ascii-line'
    | 'bars'
    | 'comet'
    | 'dither'
    | 'dot-matrix'
    | 'dots'
    | 'helix'
    | 'metaballs'
    | 'morph'
    | 'newton'
    | 'percent'
    | 'scramble'
    | 'spinner'

export const LOADER_VARIANTS = [
  'spinner',
  'dots',
  'bars',
  'dot-matrix',
  'dither',
  'morph',
  'comet',
  'scramble',
  'metaballs',
  'newton',
  'helix',
  'percent',
  'ascii',
  'ascii-line',
  'ascii-braille',
  'ascii-blocks',
  'ascii-bounce'
] as const satisfies readonly LoaderVariant[]
