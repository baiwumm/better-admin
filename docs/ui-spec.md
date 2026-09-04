# Better Admin — UI 规范

> 本文档定义 Better Admin 的页面结构、组件行为、视觉 Token 与交互规范；`/react`（Hero UI 基准版本）是 UI Source of Truth，Vue / Next.js / Nuxt 按此规范对齐。
>
> **UI 组件库策略**：React / Next.js 采用 **Hero UI 为主 + Shadcn UI 为补充**，Vue / Nuxt 采用 **Nuxt UI v4**（唯一组件库，详见 §18.3 与 `AGENTS.md` §21 / `nuxt-ui-guide.md`）；React / Next.js 样式变量以 **Hero UI 设计体系为主要参考**对齐，Vue / Nuxt 直接使用 Nuxt UI 默认 Design Tokens。

---

## 0. 文档目的与使用方式

- **定义规范**：为 Better Admin 各技术栈实现提供页面结构、Sidebar、Layout、主题、组件使用等方面的统一约定。
- **约束实现**：Vue、Next.js、Nuxt 版本按本规范还原 React 基准；跨技术栈保持 UI 一致性。
- 文档与 [`requirements.md`](requirements.md) 配合使用；`requirements.md` 定义业务需求，本文档定义 UI 与交互规范。

**优先级**：用户当前需求 > `requirements.md` > `AGENTS.md` > 本文档 > 现有代码 > 框架最佳实践。

---

## 1. 页面结构

### 1.1 当前路由结构（React Hero UI 基准）

> 路由详情以 [`routing.md`](routing.md) 为准；本节仅列出页面结构概览。

```text
/
├── (auth)/                  # 认证页（居中卡片布局）
│   └── sign-in              # 登录
├── (errors)/                # 全屏错误页
│   ├── 401 / 403 / 404 / 500
└── _authenticated/          # 认证态布局（Sidebar + Header + Main）
    ├── index                # 控制台（占位）
    ├── account              # 我的账户
    ├── my-notices           # 我的公告（登录可达）
    ├── org/
    │   ├── depts            # 组织管理
    │   ├── posts            # 岗位管理
    │   ├── directory        # 人员通讯录
    │   ├── notices          # 公告管理
    │   ├── notices_.$noticeId # 公告详情（登录可达前缀）
    │   └── chart            # 架构图谱
    └── settings/
        ├── index            # 分组兜底空页
        ├── users            # 用户管理
        ├── roles            # 角色管理
        ├── permissions      # 权限管理（只读）
        ├── menus            # 菜单管理
        ├── dicts            # 字典管理
        └── logs             # 日志管理
```

### 1.2 现有页面模式

| 模式 | 代表页面 | 结构特征 |
| --- | --- | --- |
| Dashboard | `/` | `Header`（Search/ThemeSwitch/ThemeSettingsDrawer/ProfileDropdown）+ `Main`（标题行 + Tabs + 统计卡片网格 + 图表网格） |
| 列表管理 | `/users`、`/tasks` | `Header fixed` + `Main`（页头：标题 + 描述 + 主操作按钮）+ `DataTable`（Toolbar / Table / Pagination / BulkActions）+ 全局 `Dialogs` |
| 卡片网格 | `/apps` | 页头 + 筛选/排序控件 + 分隔线 + 卡片网格（`md:grid-cols-2 lg:grid-cols-3`） |
| 认证页 | `/sign-in` 等 | `AuthLayout`（居中 Logo + 标题）+ `Card max-w-sm` + 表单 + 页脚说明 |
| 错误页 | `/403` `/404` `/500` | 全屏居中：超大数字 + 说明 + `Go Back` / `Back to Home` 按钮 |
| 占位页 | `/help-center` | `ComingSoon`（图标 + 标题 + 描述） |

### 1.3 页面结构规划

业务页面按 `requirements.md` 第 10 章规划，路由与结构如下：

| 路由 | 页面 | 模块 | 主要 UI 模式 | 状态 |
| --- | --- | --- | --- | --- |
| `/` | Dashboard | 数据统计 | Dashboard 模式（统计卡片 + 图表 + 最近活动） | 占位 |
| `/settings/users` | 用户管理 | 用户 | 列表模式（列表/搜索/分页/详情/新建/编辑/删除/状态） | ✅ 已实现 |
| `/settings/roles` | 角色管理 | 角色 | 列表模式 + 菜单授权抽屉（树形授权 + 权限位多选） | ✅ 已实现 |
| `/settings/permissions` | 权限管理 | 权限 | 只读位掩码枚举字典 | ✅ 已实现 |
| `/settings/menus` | 菜单管理 | 菜单 | 树形表格 + CRUD + add-child + 权限关联 | ✅ 已实现 |
| `/settings/dicts` | 字典管理 | 字典 | 双栏模式（字典类型列表 + 字典项 DataTable） | ✅ 已实现 |
| `/settings/logs` | 日志管理 | 日志 | 列表模式（只读）+ 字典驱动类型筛选 + 详情 Drawer | ✅ 已实现 |
| `/org/depts` | 组织管理 | 组织 | 左树右表 + 同级拖拽排序 | ✅ 已实现 |
| `/org/posts` | 岗位管理 | 组织 | 列表模式（岗位 CRUD + 在职成员穿透抽屉） | ✅ 已实现 |
| `/org/directory` | 人员通讯录 | 组织 | 左树右表 + URL Query 筛选（`?deptId=`）+ Excel 导出 | ✅ 已实现 |
| `/org/notices` | 公告管理 | 组织 | 列表模式（富文本编辑器 + 范围选择 + 已读统计） | ✅ 已实现 |
| `/org/notices/:noticeId` | 公告详情（消费端） | 组织 | 详情页（登录可达前缀，服务端可见性校验） | ✅ 已实现 |
| `/org/chart` | 组织架构图谱 | 组织 | 图谱可视化模式（只读：平移 / 缩放 / Fit View / 节点点击 / 折叠展开） | ✅ 已实现（React / Next） |
| `/my-notices` | 我的公告 | 组织 | 左列表右详情（URL `?noticeId=` 驱动） | ✅ 已实现 |
| `/account` | 我的账户 | 用户 | 卡片式多分区设置 | ✅ 已实现 |
| `/sign-in` 等 | 认证页 | 认证 | 认证模式（居中卡片布局） | ✅ 已实现 |
| `/403` `/404` `/500` | 错误页 | 系统 | 全屏错误模式 | ✅ 已实现 |

> **UI 组件库差异说明**：React / Next.js 使用 **Hero UI** 组件（Button / Modal / Tabs 等），Vue / Nuxt 使用 **Nuxt UI** 组件（布局用 Dashboard 套件）；组件库不同，但**页面功能、布局结构、交互逻辑、数据流保持一致**。

**页面结构规范（Better Admin）**：

1. 列表类页面统一采用「页头 + DataTable + 全局 Dialogs」三段结构；页头包含标题、描述、主操作区（右对齐）。
2. 新建/编辑使用右侧 Drawer（Sheet），删除与危险操作使用确认 Dialog，禁止在表格行内内联展开复杂表单。
3. Dashboard 统一为「标题行 + Tabs + 统计卡片 + 图表 + 最近活动」结构，卡片网格与图表布局遵循 4/7 分栏。
4. 设置类页面统一使用左侧 sticky 导航 + `ContentSection` 结构，表单内容不超过 `max-w-xl`。
5. 认证页统一使用 `AuthLayout` + 居中卡片，卡片宽度 `max-w-sm`。
6. 详情展示优先使用 Drawer 或 Dialog（`max-w-lg` 或 `max-w-2xl`），不新建独立详情路由（除非需求明确）。

**组织架构图谱（阶段 4，React 端实施中——本阶段 UI 与交互基准）**：

- **定位**：只读可视化。允许画布平移、缩放、Fit View、点击节点、折叠 / 展开组织节点；禁用节点自由拖拽、连线创建 / 编辑、拖拽改变组织结构——图谱可视化引擎，不做成流程编辑器。
- **交互**：节点点击跳转通讯录统一 URL Query `/org/directory?deptId=xxx`（禁用路由 state）；第一版控件提供 Zoom Controls / Fit View / 画布平移，Minimap 不默认必备，按实际节点规模决定。
- **视觉**：节点卡片用项目 Design Tokens + HeroUI 组件（React / Next 端）渲染，停用组织沿用置灰；连线与画布背景提供 light / dark 两套值（对齐 §17.2）；数据加载 / 空状态对齐 §14 / §13。
- **四端一致性原则**：统一「数据模型 + 节点字段 / 状态 + 节点 / 连线视觉 + 交互规范」，实现库各端自选（React / Next → `@xyflow/react`；Vue / Nuxt → `@vue-flow/core`，届时确认维护状态），一致性靠本规范保证而非同一实现库。
- **实现约束**：`@xyflow/react` 随图谱页面懒加载（React.lazy / `next/dynamic`），默认不做 SSR；`write-excel-file` 在用户触发导出时动态 `import()`（不占通讯录页初始包体积）；d3-hierarchy 等布局库在确认布局需求前不引入；数据源复用 `GET /org/depts/tree`（无契约变更）。

---

## 2. Layout

### 2.1 现状（认证态布局层级）

```text
SearchProvider
└── LayoutProvider
    └── SidebarProvider
        ├── SkipToMain
        ├── AppSidebar
        └── SidebarInset (@container/content)
            └── Header + Main（页面内容）
```

- `SidebarInset` 使用 **container queries**（`@container/content`），DataTable 分页等组件基于容器宽度自适应。
- `Main`：默认 `px-4 py-6`；非 fluid 时在 `@7xl/content` 下居中并限宽 `max-w-7xl`；`fixed` 变体为全高 flex 布局（设置页）。
- `Header`：高度 `h-16`，内容 `p-4 sm:gap-4`；`fixed` 时 `sticky top-0`，滚动超过 10px 后显示阴影 + `backdrop-blur` 背景。
- 主题设置抽屉（`ThemeSettingsDrawer`，即旧称 ConfigDrawer）支持：主题（system/light/dark）、Sidebar 变体、Layout 模式、主题色板（6 套），偏好经 zustand persist 存 **localStorage**（永不过期；不使用 Cookie）。
- 顶部进度条（bprogress）在路由切换时显示；`Toaster` 全局挂载在根布局。

### 2.2 Better Admin Layout 规范

1. 保留现有层级：`SidebarProvider > SidebarInset > Header + Main`，不改变整体骨架。
2. 默认配置固定为：Sidebar 变体 **inset**、折叠模式 **icon**、主题 **system**、方向 **ltr**；`ThemeSettingsDrawer`（主题设置抽屉）作为用户偏好入口保留。
3. 页面内容统一使用 `Main`（默认居中限宽 `max-w-7xl`），全高场景使用 `Main fixed`。
4. `Header` 右侧操作区顺序统一为：`Search` → `ThemeSwitch` → `ThemeSettingsDrawer` → `ProfileDropdown`（从左到右）。
5. 列表页使用 `Header fixed`，其余页面使用普通 `Header`。
6. 禁止在页面内自行实现 sticky/fixed 布局，统一通过 `Header fixed` / `Main fixed` 组合。

---

## 3. Sidebar

### 3.1 现状（shadcn/ui Sidebar 二次封装）

**尺寸与行为**：

| 项 | 值 |
| --- | --- |
| 桌面展开宽度 | `16rem`（`--sidebar-width`） |
| 移动端宽度 | `18rem`（`--sidebar-width-mobile`） |
| 折叠（icon）宽度 | `3rem`（`--sidebar-width-icon`） |
| 变体 | `sidebar` / `floating` / `inset`（默认 **inset**） |
| 折叠模式 | `offcanvas` / `icon` / `none`（默认 **icon**） |
| 快捷键 | `Ctrl/Cmd + B` 切换 |
| 状态持久化 | Cookie `sidebar_state`（7 天） |
| 移动端行为 | 变为 Sheet 抽屉（`SheetContent`） |

**结构**：

```text
Sidebar
├── SidebarHeader   → TeamSwitcher（团队/应用切换，可替换为 AppTitle/Logo）
├── SidebarContent  → NavGroups（分组 + 菜单项）
│                      ├── 普通项：图标 + 标题 + Badge
│                      └── 分组项：Collapsible 子菜单（折叠态变为右侧 Dropdown）
├── SidebarFooter   → NavUser（头像 + 名称 + 邮箱 + 用户菜单）
└── SidebarRail
```

- 导航数据来源：后端 `GET /api/menus`（MenuNode[]），前端 `useMenus` hook 拉取 + 权限过滤 + 合并硬编码「控制台」节点。
- 高亮规则（`findActivePath`）：递归匹配当前路径对应叶子节点及其祖先链。
- 折叠态下的分组项自动切换为 Dropdown 弹出子菜单。

### 3.2 Better Admin Sidebar 规范

1. **结构**：保留 `SidebarHeader（Logo + 产品名）/ SidebarContent（导航分组）/ SidebarFooter（用户信息）` 三段结构。
2. **品牌化**：将 `TeamSwitcher` 替换为 `AppTitle`（Logo + "Better Admin"）；移除多团队切换 Demo 数据。
3. **菜单结构**（接入 RBAC 后按权限过滤）：

```text
概览
├── Dashboard          /
组织中心
├── 组织管理           /org/depts
├── 岗位管理           /org/posts
├── 人员通讯录         /org/directory
├── 公告管理           /org/notices
系统管理
├── 用户管理           /users
├── 角色管理           /roles
├── 权限管理           /permissions
├── 菜单管理           /menus
├── 字典管理           /dicts
└── 日志               /logs
```

4. 菜单项图标统一使用 lucide-react；子菜单使用 Collapsible；徽标（Badge）仅用于数字类提示，统一 `rounded-full px-1 py-0 text-xs`。
5. 导航数据继续保持单一数据源（`sidebar-data` 结构），后续接入 RBAC 后按权限过滤，不散落写死在页面里。
6. 用户区（NavUser）：头像 + 名称 + 邮箱 + 菜单（个人设置 / 退出登录）；退出登录沿用确认 Dialog。
7. 默认变体 inset + icon 折叠，`Ctrl/Cmd + B` 与移动端抽屉行为保留。

---

## 4. 主题

### 4.1 现状

- **实现**：`ThemeProvider`（`src/context/theme-provider.tsx`），在 `<html>` 上切换 `light` / `dark` class。
- **选项**：`system`（默认）/ `light` / `dark`；`system` 跟随系统并监听 `prefers-color-scheme` 实时变化。
- **持久化**：Cookie `vite-ui-theme`，有效期 1 年。
- **入口**：Header 的 `ThemeSwitch`（Dropdown，sun/moon 动画切换）；`ThemeSettingsDrawer` 的 Theme 选择。
- **CSS 策略**：Tailwind v4 `@custom-variant dark (&:is(.dark *))`，即 class 策略。
- **浏览器主题色**：切换时同步更新 `<meta name="theme-color">`（light `#fff` / dark `#020817`）。

### 4.2 Better Admin 主题规范

1. 保留 `ThemeProvider` 机制（system/light/dark + class 策略 + Cookie 持久化），不更换方案。
2. 所有颜色一律通过 CSS 变量（`--background`、`--primary` 等）与 Tailwind 语义类使用，**禁止在业务代码中硬编码色值**。
3. 品牌化仅修改 `src/styles/theme.css` 中的变量值（如 `--primary`、`--chart-*`），组件代码不动。
4. `theme-color` 元信息随主题同步（保留现有行为）。

---

## 5. 颜色

### 5.1 现状（`src/styles/theme.css`，baseColor: slate，CSS Variables + oklch）

**Light：**

| Token | 值（oklch） | 说明 |
| --- | --- | --- |
| `--background` | `1 0 0` | 页面背景（白） |
| `--foreground` | `0.129 0.042 264.695` | 主文字（近黑蓝） |
| `--card` / `--card-foreground` | 同 background / foreground | 卡片 |
| `--popover` / `--popover-foreground` | 同 background / foreground | 弹层 |
| `--primary` / `--primary-foreground` | `0.208 0.042 265.755` / `0.984 0.003 247.858` | 主色（深色按钮 + 浅色文字） |
| `--secondary` / `--secondary-foreground` | `0.968 0.007 247.896` / 同 primary | 次按钮 |
| `--muted` / `--muted-foreground` | `0.968 0.007 247.896` / `0.554 0.046 257.417` | 弱化背景 / 弱化文字 |
| `--accent` / `--accent-foreground` | 同 secondary | hover 高亮 |
| `--destructive` | `0.577 0.245 27.325` | 危险（红） |
| `--border` / `--input` | `0.929 0.013 255.508` | 边框 / 输入框边框 |
| `--ring` | `0.704 0.04 256.788` | 焦点环 |
| `--chart-1..5` | `0.646 0.222 41.116` / `0.6 0.118 184.704` / `0.398 0.07 227.392` / `0.828 0.189 84.429` / `0.769 0.188 70.08` | 图表系列色 |
| `--sidebar*` | 引用 background/foreground/primary/accent/border/ring | Sidebar 语义色 |

**Dark：**

| Token | 值（oklch） | 说明 |
| --- | --- | --- |
| `--background` | `0.129 0.042 264.695` | 近黑蓝背景 |
| `--foreground` | `0.984 0.003 247.858` | 近白文字 |
| `--card` | `0.14 0.04 259.21` | 卡片比背景略亮 |
| `--primary` / `--primary-foreground` | `0.929 0.013 255.508` / 近黑 | 主色反转为浅色 |
| `--secondary` / `--muted` / `--accent` | `0.279 0.041 260.031` | 弱化背景 |
| `--destructive` | `0.704 0.191 22.216` | 危险色提亮 |
| `--border` / `--input` | `white 10%` / `white 15%` | 半透明边框 |
| `--ring` | `0.551 0.027 264.364` | 焦点环 |
| `--chart-1..5` | `0.488 0.243 264.376` / `0.696 0.17 162.48` / `0.769 0.188 70.08` / `0.627 0.265 303.9` / `0.645 0.246 16.439` | 深色图表系列色 |

**语义约定（现状）：**

- `muted` / `muted-foreground`：次要文字、描述、占位符。
- `accent` / `accent-foreground`：hover/选中背景。
- `destructive`：删除、危险操作、错误状态（表单错误边框/文字）。
- `chart-1..5`：图表系列色，图表一律使用 `fill-primary` / chart token，不硬编码颜色。

### 5.2 Better Admin 颜色规范

1. 保留 slate 中性色体系与 oklch 变量结构；品牌化阶段只调整 `--primary`、`--ring`、`--chart-*` 与 sidebar 语义色。
   - 策略更新（§18.3）：样式变量 / Design Tokens 以 **Hero UI 设计体系为主要参考**，Shadcn UI 复用同一套项目级变量，不再单独维护一套独立视觉体系；上表数值为现状记录，按 Hero UI 对齐的调整在后续阶段实施评估。
2. 主色需满足对比度：浅色模式下主按钮文字对比度 ≥ 4.5:1；Dark 模式沿用「主色反转」策略。
3. 状态色映射（业务统一）：
   - 正常/启用/成功 → `primary` 或 `chart-2`（绿）Badge
   - 停用/禁用/失败 → `muted` / `destructive`
   - 处理中/待处理 → `secondary` / outline
4. 禁止直接使用 Tailwind 色板类（如 `text-gray-500`、`bg-blue-50`）表达语义；一律走语义 token。

---

## 6. 字体

### 6.1 现状

- Google Fonts 引入 **Inter**（100–900）与 **Manrope**（200–800）。
- 可选字体：`inter`（默认）/ `manrope` / `system`（`src/config/fonts.ts`）。
- `FontProvider` 在 `<html>` 上添加 `font-inter` 等 class 实现全局字体切换；Cookie `font` 持久化 1 年。
- Tailwind v4 `@theme inline` 定义 `--font-inter`、`--font-manrope`。
- 字号习惯：页面标题 `text-2xl font-bold tracking-tight`（设置页 `md:text-3xl`）；CardTitle `font-semibold`；正文 `text-sm`；辅助文字 `text-xs`。

### 6.2 Better Admin 字体规范

1. 默认字体 **Maple Mono CN**（全局主字体，自托管分包，OFL-1.1）；正文与 UI 统一使用，可选 Inter / Manrope / system（`/settings/appearance` 可切换）。
2. 字号阶梯固定：页面标题 `text-2xl font-bold tracking-tight`（可选 `md:text-3xl`）→ 区块标题 `text-lg font-medium/semibold` → 正文 `text-sm` → 辅助 `text-xs` → 表单标签 `text-sm font-medium`。
3. 保留字体切换能力（Inter / Manrope / system），默认 Inter。
4. 中文本地化阶段：补充中文回退字体（如 system-ui / PingFang SC / Microsoft YaHei），在 `--font-inter` 等变量中追加回退栈。

---

## 7. 间距

### 7.1 现状（Tailwind v4 默认 spacing，基准 `0.25rem`）

| 场景 | 实际值 |
| --- | --- |
| 页面主体内边距 | `Main px-4 py-6` |
| Header | `h-16`，内容 `p-4`（`sm:gap-4`） |
| 卡片 | `py-6`，Header/Content/Footer `px-6`，内部 `gap-6` |
| 页头与内容 | 页头下 `space-y-2` / `mb-2`；内容区 `gap-4 sm:gap-6` |
| 表单字段 | `FormItem gap-2`；表单整体 `space-y-6` |
| 表格行 | `TableCell p-2`，`TableHead h-10 px-2` |
| Dialog | `p-6`，内部 `gap-4` |
| Sheet | 头部/底部 `p-4`，表单区 `px-4 space-y-6` |
| 工具条按钮 | 高度 `h-8`，搜索框 `w-37.5 lg:w-62.5` |
| 容器限宽 | `container` 工具类 `padding-inline: 2rem`；内容 `max-w-7xl` |

### 7.2 Better Admin 间距规范

1. 统一使用 Tailwind 默认 spacing 刻度，不引入自定义间距变量；常用刻度：`1`、`1.5`、`2`、`4`、`6`、`8`、`12`。
2. 页面级间距固定：`Main px-4 py-6`；内容区纵向 `gap-4`（宽屏 `gap-6`）。
3. 卡片级：卡片内 `px-6 / py-6`，卡片间 `gap-4`。
4. 表单级：字段间 `space-y-6`（Drawer）/ `gap-4`（网格表单），字段内 `gap-2`。
5. 表格级：行内 `p-2`、表头 `h-10`，工具条按钮 `h-8`。
6. 所有间距通过 class 表达，禁止魔法数字内联样式。

---

## 8. 圆角

### 8.1 现状（`--radius: 0.625rem`，即 10px）

| 令牌 | 计算值 | 使用组件 |
| --- | --- | --- |
| `--radius-sm` | `6px`（radius − 4px） | 小元素、关闭按钮等 |
| `--radius-md` | `8px`（radius − 2px） | Button、Input、Select、Badge、Skeleton、Tabs |
| `--radius-lg` | `10px`（radius） | Dialog、Sheet 内卡片、Alert、TabList |
| `--radius-xl` | `14px`（radius + 4px） | Card、floating Sidebar |

### 8.2 Better Admin 圆角规范

1. 保留 `--radius = 0.625rem` 与 sm/md/lg/xl 派生刻度，品牌化阶段不调整圆角体系。
2. 组件圆角绑定关系固定：表单控件/按钮 `md`、卡片 `xl`、弹层 `lg`、徽标 `md`（Sidebar 数字徽标圆形）。
3. 图表柱状条圆角统一 `radius: [4, 4, 0, 0]`。
4. 新增组件必须从这套刻度取值，禁止使用任意圆角值。

---

## 9. 表格（DataTable）

### 9.1 现状（TanStack Table v8 + 可复用 DataTable）

**组成**：`DataTableToolbar` / `DataTableColumnHeader` / `DataTablePagination` / `DataTableBulkActions` / `DataTableFacetedFilter` / `DataTableViewOptions`。

| 能力 | 实现要点 |
| --- | --- |
| 搜索 | Toolbar 搜索框（`h-8`），支持全局过滤或指定列过滤 |
| 筛选 | FacetedFilter（Dropdown + Checkbox + 图标），列过滤 |
| 重置 | 有筛选时显示 ghost 风格 Reset 按钮 |
| 列显隐 | ViewOptions（Dropdown 勾选列） |
| 排序 | 列头排序（升/降），列定义 meta 控制样式 |
| 行选择 | Checkbox 多选 + `DataTableBulkActions`（底部浮动批量操作条） |
| 分页 | 页大小 Select（10/20/30/40/50）+ 页码按钮（最多 5 个，省略号折叠）+ 首/末页（窄容器隐藏）+ 响应式换行 |
| URL 同步 | `useTableUrlState` 将分页/筛选/搜索同步到 URL（可分享、可回退） |
| 空态 | 单行 `No results.`（`h-24 text-center`） |
| 视觉 | 外层 `rounded-md border overflow-hidden`；表头 `h-10 px-2 text-start font-medium`；单元格 `p-2 whitespace-nowrap`；行 hover `bg-muted/50`；选中行 `bg-muted` |

### 9.2 Better Admin 表格规范

1. 所有列表页统一使用现有 `DataTable` 组合，禁止页面内另写表格样式。
2. 列表状态（搜索/筛选/排序/分页）统一同步 URL（`useTableUrlState` 模式）。
3. 列定义规范：
   - 第一列（如可多选）为 Checkbox 选择列；
   - 行操作列固定在末尾，使用 `DropdownMenu`（查看/编辑/删除），删除项红色 `destructive`；
   - 状态字段使用 Badge（`rounded-full`）表达语义色；
   - 长文本列支持 `line-clamp`，避免破坏行高。
4. 表格容器外层统一 `rounded-md border`，横向溢出滚动。
5. 空态文案不得直接写 `No results.`，统一走 Empty State 组件（见 §14）。
6. 分页默认 `pageSize 10`，可选 10/20/30/40/50。

---

## 10. 表单

### 10.1 现状（react-hook-form + zod + @hookform/resolvers）

- shadcn/ui `Form`（`FormProvider` + `FormField` + `FormItem` + `FormLabel` + `FormControl` + `FormDescription` + `FormMessage`）。
- `FormItem`：`grid gap-2`；`FormLabel`：`text-sm font-medium`（错误时 `text-destructive`）；`FormDescription`：`text-sm text-muted-foreground`；`FormMessage`：`text-sm text-destructive`。
- 控件基准：`Input` / `Select` / `Textarea` 高度 `h-9`（`sm` 变体 `h-8`）、`rounded-md border-input`、`bg-transparent`、`px-3`、`text-base md:text-sm`；focus 时 `border-ring + ring 3px ring-ring/50`；错误时 `border-destructive + ring-destructive/20`；禁用 `opacity-50`。
- Dark 模式下控件 `dark:bg-input/30`。
- 其他控件：Checkbox、RadioGroup、Switch、InputOTP、Calendar/DatePicker、SelectDropdown（带图标选项封装）。
- 表单承载：新建/编辑统一放 Drawer（`Sheet`）；提交按钮 `Button type="submit"`，表单 `id` 与 Drawer 底部按钮关联。

### 10.2 Better Admin 表单规范

1. 表单统一 react-hook-form + zod schema（`z.object`），`zodResolver` 校验；类型从 schema 推导（`z.infer`）。
2. 字段布局：单列表单 `space-y-6`；多字段行内网格 `grid gap-4`（如 `sm:grid-cols-2`）。
3. 表单承载规则：新建/编辑 → Drawer；删除 → ConfirmDialog；批量导入 → Dialog；设置页 → 内联表单（`ContentSection` + `max-w-xl`）。
4. 必填标记：label 不加 `*`，通过校验提示表达（保留 shadcn 默认行为），如业务要求可在 Label 追加。
5. 提交按钮：Drawer/Dialog 底部右侧（`justify-end`），取消按钮为 `outline` 在左；提交中禁用并显示加载态（§15）。
6. 错误提示统一显示在字段下方（`FormMessage`），服务端错误走 Toast + 字段级错误映射。
7. 手机端输入 `font-size: 16px` 防缩放行为保留（`index.css` 已内置）。

---

## 11. Dialog / Drawer

### 11.1 现状

**Dialog（Radix）**：

- Overlay：`bg-black/50`，fade 动画。
- Content：屏幕居中（`top-50% left-50% translate`），`w-full max-w-[calc(100%-2rem)] sm:max-w-lg`，`rounded-lg border bg-background p-6 shadow-lg`，`zoom-in-95` 进入动画；右上角关闭按钮。
- 结构：`DialogHeader`（`text-center sm:text-start`，Title `text-lg font-semibold`，Description `text-sm text-muted-foreground`）+ `DialogFooter`（`flex-col-reverse sm:flex-row sm:justify-end`）。
- 确认框：`ConfirmDialog`（`max-w-md`），危险操作 `destructive`（标题 + 描述 + 取消/确认）。

**Drawer（Sheet）**：

- 右侧滑出（`w-3/4 sm:max-w-sm`，移动端近全宽），`slide-in-from-end` 动画，`shadow-lg`。
- 结构：`SheetHeader text-start` + 内容区（`flex-1 overflow-y-auto`）+ `SheetFooter`。

**管理范式**：

- 每个列表页一个 `XxxProvider`（Context），`useDialogState` 管理 `open: 'add' | 'edit' | 'delete' | null` + `currentRow`；`XxxDialogs` 集中渲染所有弹层。

### 11.2 Better Admin Dialog/Drawer 规范

1. 弹层统一通过页面级 `Provider + Dialogs` 模式管理，禁止页面内散落多个弹层状态。
2. Dialog 尺寸约定：确认框 `max-w-md`；详情 `max-w-lg`；复杂详情 `max-w-2xl`；Drawer 默认 `sm:max-w-sm`，复杂表单可 `sm:max-w-lg`。
3. 删除/不可逆操作必须使用 `ConfirmDialog`（destructive），确认文案明确对象（如「删除用户 xxx？」），描述说明不可恢复。
4. 关闭行为：Esc / 遮罩点击 / 右上角关闭按钮；关闭后清理表单状态与 `currentRow`。
5. 动画与结构沿用现有实现，不引入新的弹层方案。

---

## 12. Toast

### 12.1 现状（sonner）

- `Toaster` 全局挂在根布局（`src/routes/__root.tsx`），`duration 5000`，主题跟随 `useTheme`（`--normal-bg: var(--popover)` 等与主题联动）。
- 默认位置：sonner 默认（右上角）。
- 错误链路：`QueryClient` 全局配置 —— mutation `onError` 走 `handleServerError`；401 → `toast.error('Session expired!')` + 重置认证 + 跳转登录；500 → `toast.error('Internal Server Error!')` + 跳转 `/500`；304 → `toast.error('Content not modified!')`；403 预留处理。

### 12.2 Better Admin Toast 规范

1. Toast 仅用于操作反馈与服务端错误，位置固定右上角，`duration 5000`。
2. 语义：成功操作 `toast.success`；失败/错误 `toast.error`；异步请求进行中 `toast.loading` + 完成后更新。
3. 表单字段级错误不进 Toast，显示在字段下方；全局/非字段错误走 Toast。
4. 错误文案：401/403/500 沿用现有全局处理链路，业务错误优先展示后端 `message`。

---

## 13. Empty State

### 13.1 现状

- 表格空数据：单行 `No results.`（`h-24 text-center`）——仅文字，无图标。
- 未开发页面：`ComingSoon`（`Telescope` 图标 72 + `text-4xl font-bold` + muted 描述，全屏居中）。
- 无统一的业务 EmptyState 组件。

### 13.2 Better Admin Empty State 规范

1. **统一 `EmptyState` 组件**：图标（lucide，如 `Inbox`/`SearchX`）+ 标题（`font-semibold`）+ 描述（`text-sm text-muted-foreground`）+ 可选操作按钮，居中布局。
2. 表格空态：筛选无结果 → 图标 `SearchX` + 「未找到匹配结果」+ Reset 按钮；列表无数据 → 图标 `Inbox` + 「暂无数据」+ 新建按钮（有权限时）。
3. 页面占位（未开发模块）沿用 `ComingSoon`，文案统一「该页面尚未开发」。

---

## 14. Loading

### 14.1 现状

- `Skeleton`：`animate-pulse rounded-md bg-accent`（shadcn/ui）。
- 路由级：bprogress 顶部进度条（路由切换时显示）。
- 数据级：TanStack Query 全局配置（retry：开发 0 次 / 生产最多 3 次且 401/403 不重试；`refetchOnWindowFocus` 仅生产；`staleTime 10s`）。
- 当前 Demo 页面均为静态数据，无页面级骨架屏实例。

### 14.2 Better Admin Loading 规范

1. 列表页加载：表格区域显示骨架（表头 + 6 行 `Skeleton`，React 端 `DataTable` 内置）；**Next 端为刻意差异**——保持 Spinner 遮罩（blur）不变（Next 无 KeepAlive，页面切换即卸载重挂，首屏骨架价值有限；见 `next/src/components/common/data-table/data-table.tsx` 注释）。
2. Dashboard 加载：统计卡片与图表区域分别显示骨架卡片。
3. 按钮加载：提交/保存中显示 spinner（lucide `LoaderCircle` 旋转）+ 禁用，文案保持动作含义。
4. 路由切换保留顶部进度条；`refetchOnWindowFocus` 生产开启。
5. 加载态与空态、错误态互斥：同一区域只呈现一种状态。

---

## 15. Error State

### 15.1 现状

- 全屏错误页：401/403/404/500/503，结构为 `h-svh` 居中，`text-[7rem] font-bold` 数字 + `font-medium` 标题 + `text-muted-foreground` 描述 + `mt-6 flex gap-4` 两个按钮（`Go Back` outline / `Back to Home` default）。
- 根路由 `notFoundComponent: NotFoundError`、`errorComponent: GeneralError`。
- 业务错误：`handleServerError` + QueryCache/mutation onError 全局处理（见 §12）。

### 15.2 Better Admin Error State 规范

1. 保留全屏错误页与根路由兜底；错误页文案已中文化。
2. 路由/权限错误：401 → 跳转登录（带 redirect）；403 → 提示无权限并跳转错误页；服务端 500 → Toast + `/500` 页。
3. 区块级错误（如表内加载失败）：使用 `Alert destructive` + 重试按钮，不跳全屏。
4. 所有错误场景必须有用户可执行的下一步（返回 / 重试 / 回首页）。

---

## 16. Responsive

### 16.1 现状

- 断点：Tailwind 默认 `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`；容器断点 `@2xl/content`、`@3xl/content`、`@7xl/content`（container queries）。
- Sidebar：桌面固定，`md` 以下变 Sheet 抽屉（`18rem`），触发按钮移动端放大（`max-md:scale-125`）。
- Header：`p-4 sm:gap-4`；`TopNav` 桌面 `lg:flex`，窄屏收敛为 Dropdown。
- Dashboard 卡片：`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`；图表区 `lg:grid-cols-7`（4 + 3）。
- 设置页：`lg:flex-row`，左侧导航 `lg:w-1/5` sticky。
- DataTable：容器 `overflow-x-auto`；分页窄容器 `flex-col-reverse`；「每页行数」窄屏隐藏文字；首/末页按钮窄容器隐藏。
- 移动端输入 `font-size: 16px` 防 iOS 聚焦缩放（`index.css` 内置）。
- 移动端 Toolbar 下移（`max-sm:has-[div[role="toolbar"]]:mb-16`）避免遮挡。

### 16.2 Better Admin Responsive 规范

1. 移动优先：页面主体 `px-4`，内容列默认单列，`sm/lg` 逐级升列。
2. 列表页必须支持横向滚动（表格容器 `overflow-x-auto`），不压缩列宽。
3. 操作按钮在窄屏只保留图标或收敛进 Dropdown，禁止横向溢出。
4. 图表统一 `ResponsiveContainer` 自适应，不固定像素宽。
5. 触摸目标 ≥ 32px（icon 按钮 `size-8/9` 满足），焦点可见。
6. 断点仅使用 Tailwind 默认值，不新增自定义断点。

---

## 17. Dark Mode

### 17.1 现状

- class 策略：`<html class="light|dark">` + `@custom-variant dark`。
- Token 对比（关键差异）：
  - 背景：白 → 近黑蓝（`0.129` 亮度）；
  - 卡片：纯白 → `0.14`（比背景略亮）；
  - 主色：深色 → 反转为浅色（近白），按钮在暗色下「反白」；
  - 边框：实色 → `white/10%`、输入框 `white/15%`；
  - 图表：整体提亮以提高可读性。
- 联动：`ThemeSwitch`、`ThemeSettingsDrawer`、`Toaster`、`theme-color` 元信息全部跟随主题。
- 移动端焦点缩放防护在两种主题下一致。

### 17.2 Better Admin Dark Mode 规范

1. 所有新增颜色必须同时提供 light/dark 两个 token，禁止只在浅色下测试。
2. 品牌色定制后同步验证 Dark 对比度（尤其 primary 按钮文字与背景）。
3. 图表色使用 `--chart-1..5`（两套值已定义），业务图表不写死颜色。
4. 图片资源提供 light/dark 两版（favicon 已有先例），必要时用 `dark:` 变体。
5. Dark 模式为完整一等公民，验收标准与浅色一致。

---

## 18. 组件使用原则

### 18.1 技术栈（`/react`）

| 类别 | 选型 |
| --- | --- |
| UI | React 19 + TypeScript（strict）+ Vite + Tailwind CSS v4 |
| 组件 | **Hero UI（为主，`@heroui/react`）** + **shadcn/ui（补充，new-york，源码在 `src/components/ui/`，存量保留）** + Radix UI 原语 |
| 路由 | TanStack Router（文件式 `src/routes/`） |
| 数据请求 | TanStack Query + axios |
| 表格 | TanStack Table + 自研 DataTable 封装 |
| 表单 | react-hook-form + zod + @hookform/resolvers |
| 状态 | Zustand（全局）+ Context（主题/字体/布局/搜索）+ 页面 Provider |
| 图表 | Recharts |
| 图标 | lucide-react（+ 少量 Radix Icons） |
| Toast | sonner |
| 工具 | `cn()`（clsx + tailwind-merge）、`@` 别名指向 `src/` |

### 18.2 Better Admin 组件使用原则

1. **组件优先级**：Hero UI 为主 → Shadcn UI 补充 → 项目级自定义组件（见 §18.3）；组件只从声明库（Hero UI 包 / `@/components/ui/*` / `@/components/common/*` / `@/components/business/*`）引入。
2. **不重复造轮子**：已有 DataTable、ConfirmDialog、ThemeSettingsDrawer、Header/Main 等组合组件，业务页面优先组合复用。
3. **图标统一 lucide-react**；不引入其他图标库。
4. **样式统一 Tailwind + 语义 token**：不用内联 style 表达布局/颜色；`cn()` 用于条件合并。
5. **状态分层**：服务端数据 → TanStack Query；全局 UI 状态 → Zustand；页面内弹层 → Provider + useDialogState；路由态 → URL search params。
6. **类型纪律**：业务模型定义 TS interface/type（`features/*/data/schema.ts`），严格模式，禁 `any`；API 响应类型与 Contract 对齐。
7. **依赖纪律**：不因简单功能新增依赖；优先现有能力（AGENTS.md 第 18 节）。
8. **目录纪律**：组件按 `components/ui/`（基础）、`components/common/`（通用）、`components/business/`（业务）三层组织；路由保持 TanStack Router 文件式；布局组件保留在 `layouts/components/`。
9. **无障碍**：交互元素带 `aria-label`/`sr-only` 文本；弹层标题/描述齐全；键盘可操作。
10. **Demo 清理原则**：移除官方演示数据/页面（Clerk 路由、Tasks/Chats/Apps 演示），替换为 Better Admin 业务占位或真实模块，不影响整体骨架。

---

## 18.3 UI 组件库策略（Hero UI 为主 + Shadcn UI 补充）

> 本小节为项目级 UI 组件库核心规则（与 `AGENTS.md` §7.2 / `requirements.md` §7.3 一致），React / Next.js 必须遵循；Vue / Nuxt 采用 **Nuxt UI v4**（规则见 `AGENTS.md` §21 与 `nuxt-ui-guide.md`）。

**组件优先级（React / Next.js）**：

```text
Hero UI
  ↓
Hero UI 没有对应组件 / 不适合当前场景
  ↓
Shadcn UI
  ↓
两者都无法满足需求
  ↓
项目级自定义组件
```

**选型对照（基准）**：

| 能力 | 首选（Hero UI） | 补充（Shadcn UI，存量保留） |
| --- | --- | --- |
| Button / Input / Textarea | ✅ Hero UI | 存量页面保留 Shadcn 实现，渐进迁移 |
| Select / Autocomplete / Dropdown | ✅ Hero UI | — |
| Modal / Drawer | ✅ Hero UI（新需求） | 存量 Dialog / Sheet 保留 |
| Tabs / Card / Tooltip / Popover | ✅ Hero UI | — |
| Avatar / Badge / Chip / Switch / Checkbox / Radio | ✅ Hero UI | — |
| Progress / Spinner / Pagination | ✅ Hero UI | — |
| DatePicker / DateRangePicker | ✅ Hero UI | 存量 Calendar + Popover 组合保留 |
| Table（简单场景） | ✅ Hero UI | 复杂场景走 DataTable |
| Navbar | ✅ Hero UI | — |
| Command（命令面板） | — | ✅ Shadcn（cmdk），Hero UI 无对应 |
| Sidebar | — | ✅ Shadcn（深度定制：inset/icon/offcanvas、Cookie 持久化、Cmd+B、移动端 Sheet），不建议迁移 |
| DataTable（TanStack Table） | — | ✅ 项目级能力（搜索/筛选/排序/分页/行选择/批量/列显隐/URL 同步），不重写 |
| Form（RHF + Zod 适配层） | — | ✅ Shadcn Form 保留，表单技术方案不变 |
| Dialog / AlertDialog（ConfirmDialog） | — | ✅ 存量保留；新需求可用 Hero UI Modal / Drawer |
| Toast（sonner）/ 进度条 | — | ✅ 基础设施保留 |

**样式变量统一（React / Next.js）**：

- React / Next.js 维护**一套项目级 Design Tokens**（以 `src/styles/theme.css` 语义变量为基座），Token 数值以 **Hero UI 设计体系为主要参考**。
- Shadcn UI 与 Hero UI 均消费同一套 Token；禁止各自维护独立视觉（圆角、边框、颜色、字体、阴影、间距、Focus / Hover / Disabled、Dark Mode、动画必须一致）。
- 新增组件禁止随意新增颜色 / 圆角 / 阴影 / 字体 / 间距，除非有明确设计需求（与 §5/§6/§7/§8 规则一致）。

**渐进式调整**：

- `/react` 基于 Hero UI 模板实现，**不含 Shadcn UI 组件**；新增功能一律使用 Hero UI，不一次性重构。
- 业务能力优先于组件库替换：不为了组件库统一破坏页面结构、交互、业务逻辑与 DataTable / Form 等基础设施。
- Vue / Nuxt 以 **Nuxt UI v4（`@nuxt/ui`）为唯一 UI 组件库**（2026-09 评审决策，替代原 shadcn-vue / shadcn-nuxt 策略）：组件优先级 Nuxt UI 内置 → 项目级自定义组件 → 第三方库（需评审）；布局必须优先使用官方 Dashboard 套件（`UDashboardGroup` / `UDashboardSidebar` / `UDashboardNavbar` / `UDashboardSearch` 等）；主题直接使用 Nuxt UI 默认 Design Tokens 与 Color System，暗色模式由其内置 color mode 提供；禁止引入 Vuetify、Quasar、Element Plus、PrimeVue、shadcn-vue 等替代库。硬性规则见 `AGENTS.md` §21，操作指引见 `nuxt-ui-guide.md`。

---

## 19. Phase 1B 落地记录

> ✅ **Phase 1B 已完成（2026-08-21）**：品牌化、Sidebar、页面占位、Demo 清理、中文化、规范化已全部落地。

| 序号 | 事项 | 涉及文件/范围 | 说明 |
| --- | --- | --- | --- |
| 1 | 品牌化 | `index.html`、`src/assets/`、`src/styles/theme.css` | 站点标题/描述/OG、Logo、favicon、主色与图表色 token |
| 2 | Sidebar 调整 | `sidebar-data.ts`、`app-sidebar.tsx` | TeamSwitcher → AppTitle；菜单按 §3.2 规划；清理 Demo 项 |
| 3 | Layout 调整 | Header/Main/布局页面 | 统一 Header 操作区顺序；清理演示导航 |
| 4 | 页面规划 | `src/routes/` | 按 §1.3 建立业务路由骨架与占位页 |
| 5 | Demo 清理 | `features/`、`routes/` | 移除 Tasks/Chats/Apps/Clerk/Help Center 演示 |
| 6 | 规范化收尾 | 全局 | 颜色/字号/间距按本文档对齐；中文化基础文案 |

---

## 20. 变更记录

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-21 | v0.1 | 基于 Shadcn Admin v2.2.1 源码分析产出初版 UI Spec |
| 2026-08-21 | v0.2 | Phase 1B 落地记录：品牌化、Sidebar 调整、页面占位、Demo 清理、中文化 |
| 2026-08-22 | v0.3 | UI 组件库策略更新：React / Next.js 以 Hero UI 为主 + Shadcn UI 补充（§18.3）；样式变量以 Hero UI 设计体系为主要参考；Vue / Nuxt 保持 Shadcn UI |
| 2026-09-05 | v1.2 | Vue / Nuxt 组件库策略切换为 **Nuxt UI v4**（头部策略、§1.1 差异注、§18.3）；同步 `AGENTS.md` §21 与 `docs/nuxt-ui-guide.md` |
| 2026-09-02 | v1.0 | 文档重构：基于当前 React Hero UI 基准版本更新，移除 Shadcn Admin 历史引用与 Phase 1B 规划表述，同步页面结构与技术栈现状 |
| 2026-09-03 | v1.1 | 新增组织架构图谱页面规划与交互边界（§1.3，阶段 4，未实施）；明确四端图谱 / 图表一致性原则：实现库可不同（React/Next → @xyflow/react + Recharts；Vue/Nuxt 待其对应阶段决策），视觉靠本规范对齐 |
