# React / Next.js 全局规范（Vercel Skills 适用政策）

> 本文件是 `AGENTS.md` §18 第 3 条 / §20 的展开，记录本项目对 **Vercel 官方 React Skills 三件套**的**适用政策**：
>
> - `vercel-react-best-practices` — 性能与正确性（70 条规则、8 大类，按影响力排序：消除瀑布流 `async-` / 包体积 `bundle-` / 服务端 `server-` / 客户端数据获取 `client-` / 重渲染 `rerender-` / 渲染 `rendering-` / JS 性能 `js-` / 进阶 `advanced-`；内含 `SKILL.md` 与 `rules/` 下 70 个规则文件）；
> - `vercel-composition-patterns` — 组件组合模式（复合组件、状态提升、避免 prop drilling 与布尔 prop 泛滥、组件 API 设计，含 React 19 API 变更）；
> - `vercel-react-view-transitions` — View Transition API 动画（页面 / 路由过渡、共享元素过渡、`addTransitionType` 方向性导航、CSS view transition 伪元素）。
>
> 三个 Skill 均安装于**项目级** `.agents/skills/`（在支持 universal skill 的 Agent 中随仓库自动加载）；规则详情以 Skill 为准，本文不重复摘录。
> 更新日期：2026-09-05（三件套收敛至项目级 + 新增 composition-patterns / react-view-transitions）。

---

## 硬性规则（所有 AI Agent 必须遵守）

1. **触发范围**：
   - 任务涉及 **React 或 Next.js 的代码生成、页面 / 组件新建、数据获取、重构、性能优化** → 必须先加载 `vercel-react-best-practices` 的相关规则；
   - 任务涉及 **组件设计 / 重构**（布尔 prop 泛滥、组件复用、复合组件、context provider 设计）→ 必须先加载 `vercel-composition-patterns`；
   - 任务涉及 **动画过渡**（路由 / 页面过渡、共享元素动画、组件进出动画、`startViewTransition` / `ViewTransition`）→ 必须先加载 `vercel-react-view-transitions`，且**不引入第三方动画库**（浏览器原生 API，不支持的浏览器优雅降级）。
2. **Skill 优先加载**：任务明确匹配上述触发条件时，应主动 `skill` 调用 / 读取 `.agents/skills/<skill-name>/SKILL.md`（react-best-practices 另含 `rules/` 下对应规则文件），再产出代码。
3. **代码产出即合规**：生成的 React / Next.js 代码默认应符合各 Skill 的关键规则。性能向至少包括（react-best-practices）：
   - **消除瀑布流**：在 `await` 远程值 / flag 前先做廉价的同步判断；并行获取数据（`Promise.all`）；避免嵌套串行 fetch。
   - **包体积**：避免 barrel import 引发的打包膨胀；对第三方重依赖使用动态 `import()` / `next/dynamic`；可分析路径优先。
   - **服务端**：并行 server-side fetching；不在 module 级共享可变状态；使用 React 缓存 / LRU 缓存去重。
   - **客户端数据获取**：SWR / React Query 去重请求；被动事件监听器；localStorage 访问带 schema 校验。
   - **重渲染**：`useMemo` / `useCallback` 合理使用；不在渲染中内联定义组件；派生状态优先用 `useMemo` 而非 `useEffect`；`useState` 初始化用惰性函数。
   - **渲染**：`useTransition` 处理加载态；Suspense 边界合理拆分；`content-visibility` / `useDeferredValue` 等。
   - 结构向至少包括（composition-patterns）：组件对外 API 优先对象 / 组合而非布尔开关堆叠；可复用 UI 用复合组件（`<Tabs><Tabs.List/>…`）而非 props 矩阵；跨层状态用 context / 状态提升，不层层透传。
4. **冲突裁决**：若 Skill 建议与 `AGENTS.md` 的**架构约束**（§5/§6 数据库与 API Contract）、**UI 组件库策略**（§7.2 Hero UI 优先）或**阶段性开发约束**（§18）冲突，**以 `AGENTS.md` 为高优先级**；但性能模式（如消除瀑布、并行 fetch、`useMemo` 等）**不得无故违反**。
5. **适用范围限定**：三件套均面向 **React / Next.js**。Vue / Nuxt 代码不强制套用其 React 专属规则，但「消除瀑布、并行请求、避免无谓重渲染」及组合模式等通用原则仍应参考；Vue / Nuxt 组件规范见 `AGENTS.md` §21 与 `docs/nuxt-ui-guide.md`。

---

## 安装与维护（记录）

- 三件套统一安装于**项目级** `.agents/skills/`（2026-09-05 自用户级收敛，用户级 `~/.agents/skills` 已删除）：
  - `vercel-react-best-practices`：`npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices`（2026-08-22 首装）；
  - `vercel-composition-patterns` / `vercel-react-view-transitions`：`npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns --skill vercel-react-view-transitions -y`（2026-09-05 安装）。
- 升级：`npx skills update -p <skill-name>`（项目级）；验证：`npx skills ls` 应列出对应 Skill。
- 维护约定：只保留 `.agents/skills/` 一份副本，禁止 `.claude/skills/` 等重复位置（AGENTS §18 第 6 条）；skills CLI 安装时若自动生成 `.claude/` 符号链接，安装后应删除。
