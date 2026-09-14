/**
 * 引入 React canary 通道的类型声明（@types/react/canary.d.ts）。
 *
 * Next App Router 内置 React canary，`ViewTransition` / `addTransitionType`
 * 等组件运行时可直接从 "react" 导入；但 npm 稳定版 @types/react 的主声明
 * 不含这些导出，不引入本文件时 `import { ViewTransition } from "react"`
 * 会在 next build 的类型检查阶段报错。
 *
 * 采用 import 语句而非 tsconfig `compilerOptions.types` 数组：当前 tsconfig
 * 未声明 types 数组，新增该数组会关闭 @types/* 的自动包含。
 */
import {} from "react/canary";
