# Better Admin

同一套 Admin 产品在多个技术栈上的完整实现，共用一份 PostgreSQL 数据库与一份 API 契约。

## Language

**四端**：
React、Vue、Next.js、Nuxt 四个前端实现；功能对齐与 UI 一致性只在四端之间判定。
_Avoid_：四个版本、四个项目

**五端**：
四端加上 NestJS——NestJS 只提供 REST API，不参与 UI 对齐。
_Avoid_：五个版本

**六端**：
五端加上官网文档站 `apps/website`，用于部署与 CI 口径。
_Avoid_：六个应用（除非明确指应用目录集合）

**UI Source of Truth**：
React 实现；页面结构、组件行为、交互与 Design Tokens 以它为基准。
_Avoid_：基准版本、主版本、母版

**独立全栈**：
Next.js 与 Nuxt 两个实现，自带 Server API 直连数据库，不依赖 NestJS。
_Avoid_：全栈端、后端替代品

**契约**：
`apps/nest/openapi/openapi.yaml` 定义的 API Contract，是所有实现共用的唯一真源。
_Avoid_：接口文档、API 规范

**契约版本**：
契约文件自身的版本号（如 v1.14.1），与产品版本（根 `package.json` 的 `version`）相互独立。
_Avoid_：接口版本、API 版本号

**演示场**：
`/playground/*` 下的组件演示页面集合，四端保持一致。
_Avoid_：Playground 示例、demo 页

**功能矩阵**：
`docs/feature-matrix.md`，四端功能对齐状态的唯一追踪源。
_Avoid_：功能清单、功能列表

**演示模式**：
服务端 `DEMO_MODE=true` 时开放的只读演示环境，包含 `DEMO_READONLY` 只读守卫与快捷登录。
_Avoid_：demo 模式、演示开关

**全量位**：
`super_admin` 角色持有的全 1 权限掩码；库内以 `-1n` 存储，对外 JSON 归一化为 `9223372036854775807`。
_Avoid_：超级权限、全部权限值

**项目级自定义组件**：
React / Next.js 中基于 Hero UI 原子组件拼装的第二级组件，与 Hero UI 内置组件共同构成两级组件策略。
_Avoid_：业务组件、封装组件
