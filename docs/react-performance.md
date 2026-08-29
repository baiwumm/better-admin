# React / Next.js 全局性能规范（vercel-react-best-practices）

> 本文件是 `AGENTS.md` §18 第 11 条 / §20 的展开，记录本项目对 `vercel-react-best-practices` Skill 的**适用政策**。
> Skill 本体（70 条规则、8 大类，按影响力排序：消除瀑布流 `async-` / 包体积 `bundle-` / 服务端 `server-` / 客户端数据获取 `client-` / 重渲染 `rerender-` / 渲染 `rendering-` / JS 性能 `js-` / 进阶 `advanced-`）已**全局安装**于 `~/.agents/skills/vercel-react-best-practices`（内含 `SKILL.md` 与 `rules/` 下 70 个规则文件，在支持 universal skill 的 Agent 中随仓库自动加载）；规则详情以 Skill 为准，本文不重复摘录。
> 更新日期：2026-08-30。

---

## 硬性规则（所有 AI Agent 必须遵守）

1. **触发范围**：只要任务涉及 **React 或 Next.js 的代码生成、页面 / 组件新建、数据获取、重构、性能优化**，在动手前必须先加载并遵循 `vercel-react-best-practices` Skill 的全部相关规则。
2. **Skill 优先加载**：当任务明确匹配该 Skill 的触发条件（React 组件、Next.js 页面、数据获取、包体积优化、性能改进）时，应主动 `skill` 调用 / 读取 `~/.agents/skills/vercel-react-best-practices/SKILL.md` 及其 `rules/` 下对应规则，再产出代码。
3. **代码产出即合规**：生成的 React / Next.js 代码默认应符合该 Skill 的关键规则，至少包括：
   - **消除瀑布流**：在 `await` 远程值 / flag 前先做廉价的同步判断；并行获取数据（`Promise.all`）；避免嵌套串行 fetch。
   - **包体积**：避免 barrel import 引发的打包膨胀；对第三方重依赖使用动态 `import()` / `next/dynamic`；可分析路径优先。
   - **服务端**：并行 server-side fetching；不在 module 级共享可变状态；使用 React 缓存 / LRU 缓存去重。
   - **客户端数据获取**：SWR / React Query 去重请求；被动事件监听器；localStorage 访问带 schema 校验。
   - **重渲染**：`useMemo` / `useCallback` 合理使用；不在渲染中内联定义组件；派生状态优先用 `useMemo` 而非 `useEffect`；`useState` 初始化用惰性函数。
   - **渲染**：`useTransition` 处理加载态；Suspense 边界合理拆分；`content-visibility` / `useDeferredValue` 等。
4. **冲突裁决**：若该 Skill 的某条性能建议与 `AGENTS.md` 的**架构约束**（§5/§6 数据库与 API Contract）、**UI 组件库策略**（§7.2 Hero UI 优先）或**阶段性开发约束**（§18）冲突，**以 `AGENTS.md` 为高优先级**；但性能模式（如消除瀑布、并行 fetch、`useMemo` 等）**不得无故违反**。
5. **适用范围限定**：该 Skill 面向 **React / Next.js**。Vue / Nuxt 代码不强制套用其 React 专属规则，但「消除瀑布、并行请求、避免无谓重渲染」等通用性能原则仍应参考。

---

## 安装与维护（记录）

- 安装（已执行）：`npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -g -y -a "*"`——安装到用户级目录并对各 Agent 建立 universal / symlink 关联。
- 升级：`npx skills update -g vercel-react-best-practices`；验证安装：`npx skills ls -g` 应列出该 Skill。
