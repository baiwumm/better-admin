# Nuxt UI 组件使用指引（Vue / Nuxt 端）

> 本文档是 Vue / Nuxt 端使用 **Nuxt UI v4**（`@nuxt/ui`）的操作性指引；硬性规则真源见 [`AGENTS.md`](../AGENTS.md) §21。
> API 事实来源：Nuxt UI 官方文档 https://ui.nuxt.com （当前基线 v4.x）。**禁止凭记忆或猜测使用 Nuxt UI API**，动手前必须查官方文档或已安装 Skill（见 §8）。
> UI 对齐基准：React 端（页面结构 / 交互行为）；组件视觉直接使用 Nuxt UI 默认风格。

---

## 1. 组件优先级（硬性）

Vue 端和 Nuxt 端代码生成时，UI 组件选择**必须**遵循以下优先级：

```text
Nuxt UI 内置组件（@nuxt/ui）
  ↓  没有对应组件 / 不适合当前场景（必须在代码注释中说明原因）
项目级自定义组件（基于 Nuxt UI 原子组件拼装）
  ↓  确有需要（必须先评审：记录理由 + 替代方案评估，批准后方可引入）
第三方 Vue 组件库
```

可检查标准：

1. 业务页面中出现的基础控件必须能对应到 `U*` 组件或「注释说明了原因的自定义组件」二者之一。
2. 引入任何第三方 Vue 组件库（含无头库）前，必须有评审记录（进度条目或评审文档），未记录视为违规。
3. **禁止引入** Vuetify、Quasar、Element Plus、PrimeVue、shadcn-vue 等替代 UI 库。

## 2. 代码生成前置检查（每次任务执行）

所有涉及 Vue / Nuxt 的代码生成任务，产出代码前必须：

1. 确认 Skill 已安装可用：`npx skills ls -g` 应能列出 `nuxt/ui` 与 antfu/skills 系列（`vue`、`vue-best-practices` 等）；项目级任务还应确认 `docs/nuxt-ui-guide.md` 可读。
2. 查阅 Nuxt UI 官方文档确认目标组件存在、props/slots 用法正确（v4 文档地址形如 `https://ui.nuxt.com/docs/components/<kebab-name>`）。
3. 布局相关代码**必须优先使用 Dashboard 套件**：`UDashboardGroup`、`UDashboardPanel`、`UDashboardSidebar`、`UDashboardNavbar`、`UDashboardSearch`、`UDashboardSearchButton`、`UDashboardSidebarCollapse`、`UCommandPalette`；**禁止从零手写 Sidebar/Header 布局**。
4. 不凭记忆写 API：文档与记忆冲突时以文档为准，并在发现差异时回写更新本指引。

> 命名澄清：评审与历史方案中的 `UDashboardLayout` 在 Nuxt UI v4 中的实际组件名为 **`UDashboardGroup`**（v3 → v4 更名，职责一致：布局容器 + 侧栏/面板状态持久化 + 尺寸单位定义）。

## 3. 常用组件映射表（Better Admin 场景 → Nuxt UI）

| 场景 | 组件 | 关键用法要点 |
| --- | --- | --- |
| 应用外壳 | `UApp` | 根组件包裹（toast 等全局上下文）；`index.html` 根容器加 `class="isolate"` |
| 后台布局 | `UDashboardGroup` | 包住 Sidebar + Panel + Search；提供存储持久化上下文 |
| 侧边栏 | `UDashboardSidebar` | 导航经 `items` 注入（`NavigationMenuItem[][]`：`label` / `icon` / `to` / `children` / `badge` / `defaultOpen` / `active`）；`collapsible` 允许折叠；移动端自动变 slideover（`mode` 可调）；slots：`header` / `default` / `footer` |
| 主内容面板 | `UDashboardPanel` | `header` slot 放 Navbar；`body` slot 自带滚动 + padding；多面板给 `id` |
| 顶部栏 | `UDashboardNavbar` | `title` / `icon` props；`left` / `right` slots；移动端 toggle 按钮内置（`toggle` / `toggle-side` 可定制） |
| 命令面板 / 全局搜索 | `UDashboardSearch` + `UDashboardSearchButton` | 放在 `UDashboardGroup` 默认 slot；`meta_k` 快捷键内置；**内置明暗模式切换命令组**；`groups` 数据格式见 §5 |
| 按钮 / 输入 / 文本域 | `UButton` / `UInput` / `UTextarea` | `UButton` 自带 `loading` / `icon` / `to`；颜色语义 `color="primary|neutral|error|..."`，变体 `variant="solid|outline|soft|ghost|link|subtle"` |
| 下拉菜单 | `UDropdownMenu` | `items` 数组（`label` / `icon` / `color` / `kbds` / `onSelect` / `children`）；用户菜单、行操作菜单 |
| 弹窗 / 抽屉 | `UModal` / `UDrawer` / `USlideover` | 新建/编辑表单 Drawer 用 `UDrawer` 或 `USlideover`；删除确认用 `UModal` 组装 ConfirmDialog；全屏错误页不用弹层 |
| 表单 | `UForm` / `UFormField` | `UForm :validate`（函数或 zod schema）+ `UFormField` label/description/error；M1 起接 vee-validate + zod |
| 选择类 | `USelect` / `UCombobox` / `UAutocomplete` / `UInputMenu` | 下拉选择 / 可搜索选择 |
| 选项类 | `UCheckbox` / `USwitch` / `URadioGroup` | 表格行选择、状态开关、单选组 |
| 标签 / 徽标 | `UBadge` / `UChip` | 状态列语义色（`color` + `variant="soft"`）；未读数角标用 `UChip` |
| 标签页 | `UTabs` | 日志四分类、账户双 Tab |
| 表格 | `UTable`（底层 TanStack Table） | M1 起评估：简单场景直接用；Better Admin DataTable 范式（工具栏/分页/批量/列显隐）用 `@tanstack/vue-table` + 原子组件拼装 |
| 反馈 | `useToast()` / `UAlert` / `USkeleton` | toast 右上角、`duration: 5000`；区块错误用 `UAlert`；加载骨架 |
| 键位提示 | `UKbd` | 快捷键展示（如折叠侧栏 `⌘B`） |
| 日历/日期 | 未内置完整 DatePicker | 出现需求时按 §1 优先级走「自定义组件（基于 Nuxt UI 原子拼装）」并记录原因 |
| 图标 | `UIcon`（默认 lucide 集合） | 名称形如 `i-lucide-users`；需安装 `@iconify-json/lucide`；与 lucide-vue-next 并存：`U*` 组件 `icon` prop 用字符串名，自定义模板内用 lucide-vue-next 组件 |

## 4. Dashboard 套件使用示例（M0 布局骨架）

以下为官方文档确认的最小结构（`layouts/admin.vue` 等价物）：

```vue
<template>
  <UDashboardGroup>
    <!-- 侧边栏：导航 items 注入；折叠 / 移动端抽屉由组件内置 -->
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <UDashboardSearchButton :collapsed="collapsed" />

      <UNavigationMenu :items="items" orientation="vertical" />

      <template #footer="{ collapsed }">
        <AppUserMenu :collapsed="collapsed" />
      </template>

      <UDashboardSidebarCollapse />
    </UDashboardSidebar>

    <!-- 命令面板：Cmd/Ctrl+K；内置明暗切换命令组 -->
    <UDashboardSearch :groups="searchGroups" />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar title="Better Admin">
          <template #right>
            <ThemeSwitch />
            <LanguageSwitch />
            <ProfileDropdown />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <RouterView />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
```

要点（均出自官方文档）：

- `UDashboardSidebar` 支持 `resizable` / `collapsible`、`v-model:collapsed`、`v-model:open`（移动端）；折叠时 slots 可解构 `{ collapsed }` 做图标态。
- 移动端（`lg` 以下）侧边栏自动变为 slideover（`mode` 可选 `drawer | slideover | modal`），由 Navbar 的 toggle 按钮唤起；路由切换自动关闭（`autoClose` 默认 true）。
- 自定义快捷键用 `defineShortcuts`（如 `{ c: () => (collapsed.value = !collapsed.value) }`）；`meta_k` 由 `UDashboardSearch` 内置。
- `UDashboardPanel` 使用 `resizable` 时无单一根元素，需要包裹容器或页面过渡时注意。

### CommandPalette groups 数据格式（`UDashboardSearch` 同构）

```ts
interface CommandPaletteGroup {
  id: string            // 必填，缺失整组被忽略
  label?: string
  items?: CommandPaletteItem[] // label / suffix / icon / avatar / chip / kbds / active / loading / disabled / children / onSelect
  ignoreFilter?: boolean
  highlightedIcon?: string
}
```

## 5. 与 React（HeroUI）组件对照表

| 能力 | React 端（HeroUI） | Vue 端（Nuxt UI） | 差异说明 |
| --- | --- | --- | --- |
| 按钮 | `Button` | `UButton` | 变体命名不同（solid/outline/soft/ghost/link/subtle） |
| 输入 | `TextField` + `InputGroup` | `UInput`（前缀图标用 `icon` prop 或 slot） | — |
| 下拉 | `Dropdown`（Menu） | `UDropdownMenu` | — |
| 弹窗 | `Modal` | `UModal` | — |
| 抽屉 | `Drawer` | `UDrawer` / `USlideover` | 语义近似，视觉用 Nuxt UI 默认 |
| 标签页 | `Tabs` | `UTabs` | — |
| 卡片 | `Card` | `UCard` | — |
| Toast | `toast`（react-aria） | `useToast()` | 需 `UApp` 上下文；非组件环境经回调桥接（见 api-client） |
| Select / Autocomplete | `Select` / `Autocomplete` | `USelect` / `UAutocomplete` / `UCombobox` | — |
| Checkbox / Switch / Radio | 同名 | `UCheckbox` / `USwitch` / `URadioGroup` | — |
| Avatar / Badge / Chip | 同名 | `UAvatar` / `UBadge` / `UChip` | — |
| Table（简单） | HeroUI `Table` | `UTable` | 复杂 DataTable 两端均走 TanStack Table |
| 命令面板 | 自研（cmdk 系） | `UDashboardSearch` / `UCommandPalette` | 套件内置 |
| 侧边栏 | HeroUI 双栏 + 自研导航 | `UDashboardSidebar` | 套件内置折叠/抽屉/持久化 |
| 浮层开合状态 | `useOverlayState()`（HeroUI） | 组件 `v-model:open`（Nuxt UI 受控约定） | Vue 端不沿用 HeroUI hook；受控写法见各组件文档 |

## 6. 主题与暗色模式（v1.1 修订后策略）

1. **直接使用 Nuxt UI 默认 Design Tokens 与 Color System**：语义色 `primary / secondary / success / info / warning / error / neutral`（默认映射 green/blue/green/blue/yellow/red/slate）；工具类 `text-primary`、`bg-error` 等由 `--ui-*` CSS 变量驱动，Light/Dark 两套值内置（`.dark` class 策略）。
2. **不从 React 端移植 `theme.css` token，不建立 `--ui-*` 到项目 token 的映射层**；不刻意模仿 HeroUI 视觉。
3. **暗色模式**由 Nuxt UI 内置 color mode 提供（Vue 端基于 `@vueuse/core`，`useColorMode` 自动导入，`system / light / dark` 三态）；无需对齐 React 端的暗色实现细节。
4. 品牌定制（如需）：在 `vite.config.ts` 的 `ui({ ui: { colors: { primary: '...', neutral: '...' } } })` 配置，或 CSS `@theme` 定义完整 50–950 色阶；**禁止在业务代码中硬编码色值**。
5. 字体、品牌标识（Logo、产品名 "Better Admin"）与 React 端保持一致。

## 7. 纯 Vue（Vite）项目安装事实（基线 v4.10.0）

```bash
pnpm add @nuxt/ui
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  plugins: [vue(), ui()],
})
```

```ts
// main.ts
import ui from '@nuxt/ui/vue-plugin'
// app.use(ui)；CSS 中 @import "tailwindcss"; @import "@nuxt/ui";
// App.vue 以 <UApp> 包裹根组件
```

- TypeScript：`auto-imports.d.ts` 与 `components.d.ts` 加入 tsconfig `include` 并写入 `.gitignore`；`#build/ui` 路径别名加入对应 tsconfig（build 产物声明，需先跑 `vite build` 再做类型检查）。
- 组件 / composable 自动导入默认开启（`autoImport` 选项）；关闭后需显式从 `@nuxt/ui/composables` 等路径导入。
- `router` 集成默认开启（vue-router `<RouterLink>` 语义）；图标需安装 `@iconify-json/lucide`。

## 8. Skill 环境

- `nuxt/ui` Skill 与 antfu/skills 系列（`vue` / `vue-best-practices` / `vue-router-best-practices` / `vue-testing-best-practices` / `vueuse-functions` / `pinia` / `vitest` / `vite` 等）全局安装于用户级 `~/.agents/skills/`；验证命令：`npx skills ls -g`。
- 代码生成任务开工前按 §2 前置检查执行；Skill 用法与官方文档冲突时以官方文档为准。
