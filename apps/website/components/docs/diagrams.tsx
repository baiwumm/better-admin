import type { ReactNode } from "react";

/**
 * 文档内联 SVG 图集
 *
 * 设计约定：
 * - 纯 SVG + Tailwind 语义色类（fill-card / stroke-border / fill-muted-foreground …），
 *   颜色全部走 CSS 变量，因此亮暗主题自动适配，不维护两套图。
 * - 统一 viewBox 宽度 720，页面内 `w-full` 自适应，高度按内容给。
 * - 只画「结构」与「流向」，不塞长文案——解释留给正文，
 *   图的作用是让读者 3 秒建立心智模型。
 */

/* ------------------------------- 基础原语 ------------------------------- */

const SVG_BASE = "mx-auto block h-auto w-full max-w-[720px]";

function Frame({
  title,
  viewBox,
  children,
}: {
  title: string;
  viewBox: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox={viewBox} role="img" className={SVG_BASE}>
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** 普通节点框 */
function Box({
  x,
  y,
  w,
  h,
  rx = 10,
  muted = false,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  muted?: boolean;
  dashed?: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      className={muted ? "fill-muted stroke-border" : "fill-card stroke-border"}
      strokeWidth={1}
      strokeDasharray={dashed ? "5 5" : undefined}
    />
  );
}

/** 文字：默认继承主题前景色，通过 className 覆盖字号与颜色 */
function T({
  x,
  y,
  children,
  className = "fill-foreground text-[12px]",
  anchor = "start",
}: {
  x: number;
  y: number;
  children: ReactNode;
  className?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={className}>
      {children}
    </text>
  );
}

/** 向下箭头（末端带实心箭头） */
function ArrowDown({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2 - 7}
        className="stroke-muted-foreground"
        strokeWidth={1.25}
      />
      <path
        d={`M ${x - 4.5} ${y2 - 8} L ${x + 4.5} ${y2 - 8} L ${x} ${y2} Z`}
        className="fill-muted-foreground"
      />
    </g>
  );
}

/** 向右箭头 */
function ArrowRight({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2 - 7}
        y2={y}
        className="stroke-muted-foreground"
        strokeWidth={1.25}
      />
      <path
        d={`M ${x2 - 8} ${y - 4.5} L ${x2 - 8} ${y + 4.5} L ${x2} ${y} Z`}
        className="fill-muted-foreground"
      />
    </g>
  );
}

/* ============================ 1. 总架构图 ============================ */

const FRONTENDS = [
  { x: 15, name: "React 19", sub: "UI Source of Truth" },
  { x: 190, name: "Vue 3", sub: "Nuxt UI v4" },
  { x: 365, name: "Next.js 16", sub: "独立全栈" },
  { x: 540, name: "Nuxt", sub: "独立全栈" },
];

export function ArchitectureDiagram() {
  return (
    <Frame
      title="Better Admin 总体架构：四个前端应用、可选 NestJS REST API 与统一 PostgreSQL"
      viewBox="0 0 720 424"
    >
      {/* 浏览器端分组 */}
      <Box x={6} y={16} w={708} h={112} rx={14} dashed />
      <T x={18} y={38} className="fill-muted-foreground text-[11px]">
        浏览器端｜四个独立前端应用（各自独立运行 / 构建 / 部署）
      </T>

      {FRONTENDS.map((item) => (
        <g key={item.name}>
          <Box x={item.x} y={52} w={150} h={64} />
          <T x={item.x + 14} y={78} className="fill-foreground text-[13px] font-semibold">
            {item.name}
          </T>
          <T x={item.x + 14} y={98} className="fill-muted-foreground text-[10.5px]">
            {item.sub}
          </T>
        </g>
      ))}

      {/* NestJS 层 */}
      <Box x={15} y={190} w={325} h={62} rx={12} />
      <T x={32} y={216} className="fill-foreground text-[13px] font-semibold">
        NestJS · REST API
      </T>
      <T x={32} y={236} className="fill-muted-foreground text-[10.5px]">
        为 React / Vue 提供接口 · Drizzle + pg
      </T>

      {/* 数据库 */}
      <Box x={15} y={316} w={675} h={84} rx={12} />
      <T x={32} y={344} className="fill-foreground text-[13px] font-semibold">
        PostgreSQL · Supabase 托管
      </T>
      <T x={32} y={364} className="fill-muted-foreground text-[10.5px]">
        唯一数据库 · 四端共用同一份 Schema 与数据
      </T>
      <T x={32} y={384} className="fill-muted-foreground text-[10.5px]">
        端口 6543 · transaction pooler
      </T>

      {/* 连线 */}
      <ArrowDown x={90} y1={116} y2={190} />
      <ArrowDown x={265} y1={116} y2={190} />
      <ArrowDown x={177} y1={252} y2={316} />
      <ArrowDown x={440} y1={116} y2={316} />
      <ArrowDown x={615} y1={116} y2={316} />

      <T x={452} y={206} className="fill-muted-foreground text-[10.5px]">
        不经 NestJS
      </T>
      <T x={452} y={222} className="fill-muted-foreground text-[10.5px]">
        直连数据库
      </T>
    </Frame>
  );
}

/* ========================== 2. 仓库结构图 ========================== */

const REPO_ROWS = [
  ["apps/react", "UI Source of Truth · Hero UI"],
  ["apps/vue", "按 React 复刻 · Nuxt UI v4"],
  ["apps/next", "独立全栈 · 不依赖 NestJS"],
  ["apps/nuxt", "独立全栈 · 不依赖 NestJS"],
  ["apps/nest", "REST API · Drizzle + PostgreSQL"],
  ["apps/website", "本站：官方文档站"],
  ["docs/ · assets/ · scripts/", "仓库文档 · 品牌资产 · 仓库级脚本"],
];

export function RepoStructureDiagram() {
  return (
    <Frame
      title="Better Admin 仓库结构：单仓库多独立应用"
      viewBox="0 0 720 384"
    >
      {/* 根 */}
      <Box x={20} y={162} w={120} h={62} rx={12} />
      <T x={80} y={188} anchor="middle" className="fill-foreground font-mono text-[12px] font-semibold">
        better-admin
      </T>
      <T x={80} y={208} anchor="middle" className="fill-muted-foreground text-[10.5px]">
        单仓库
      </T>

      {/* 主干与分支 */}
      <line
        x1={140}
        y1={193}
        x2={250}
        y2={193}
        className="stroke-muted-foreground"
        strokeWidth={1.25}
      />
      <line
        x1={250}
        y1={32}
        x2={250}
        y2={332}
        className="stroke-muted-foreground"
        strokeWidth={1.25}
      />

      {REPO_ROWS.map(([path, role], index) => {
        const y = 12 + index * 50;
        const cy = y + 20;
        return (
          <g key={path}>
            <line
              x1={250}
              y1={cy}
              x2={300}
              y2={cy}
              className="stroke-muted-foreground"
              strokeWidth={1.25}
            />
            <Box x={300} y={y} w={404} h={40} rx={8} />
            <T x={314} y={cy + 4} className="fill-foreground font-mono text-[11.5px]">
              {path}
            </T>
            <T x={690} y={cy + 4} anchor="end" className="fill-muted-foreground text-[10.5px]">
              {role}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* ======================== 3. 数据表分组图 ======================== */

const TABLE_GROUPS: { title: string; tables: string[] }[] = [
  {
    title: "身份与权限",
    tables: [
      "users",
      "refresh_tokens",
      "roles",
      "menus",
      "user_roles",
      "role_menus",
    ],
  },
  { title: "组织中心", tables: ["depts", "posts", "user_posts"] },
  {
    title: "公告中心",
    tables: ["notices", "notice_scopes", "notice_read_records", "notice_remind_logs"],
  },
  { title: "数据字典", tables: ["dict_types", "dict_items"] },
  { title: "审计与通知", tables: ["logs", "notifications"] },
];

export function TableGroupsDiagram() {
  return (
    <Frame
      title="Better Admin 数据模型：17 张表按领域分为五组"
      viewBox="0 0 720 322"
    >
      {TABLE_GROUPS.map((group, index) => {
        const x = 4 + index * 144;
        return (
          <g key={group.title}>
            <Box x={x} y={22} w={136} h={34} rx={8} muted />
            <T
              x={x + 68}
              y={44}
              anchor="middle"
              className="fill-foreground text-[11.5px] font-semibold"
            >
              {group.title}
            </T>
            <Box x={x} y={56} w={136} h={252} rx={8} />
            {group.tables.map((table, i) => (
              <T
                key={table}
                x={x + 12}
                y={84 + i * 21}
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {table}
              </T>
            ))}
          </g>
        );
      })}
      <T x={4} y={318} className="fill-muted-foreground text-[10.5px]">
        共 17 张表 · 全部由 Drizzle ORM 定义，四端共用
      </T>
    </Frame>
  );
}

/* ======================== 4. RBAC 授权链图 ======================== */

const RBAC_STEPS = [
  { title: "users", sub: "用户" },
  { title: "user_roles", sub: "用户 ↔ 角色" },
  { title: "roles", sub: "角色" },
  { title: "role_menus", sub: "角色 × 菜单" },
  { title: "menus", sub: "菜单树 / 按钮位" },
];

const RBAC_NOTES = [
  "① 用户 → 角色：一个用户可挂多个角色，权限按「位或」叠加。",
  "② 角色 → 菜单：每条「角色 × 菜单」记录持有一个 bigint 权限位掩码。",
  "③ 菜单 → 按钮位：菜单声明自身所需权限位，用于门控页面、按钮与 API。",
];

export function RbacChainDiagram() {
  return (
    <Frame
      title="RBAC 授权链：用户 → 用户角色 → 角色 → 角色菜单授权位 → 菜单"
      viewBox="0 0 720 282"
    >
      {RBAC_STEPS.map((step, index) => {
        const x = 14 + index * 142;
        return (
          <g key={step.title}>
            <Box x={x} y={48} w={124} h={58} />
            <T x={x + 62} y={74} anchor="middle" className="fill-foreground font-mono text-[11.5px] font-semibold">
              {step.title}
            </T>
            <T x={x + 62} y={93} anchor="middle" className="fill-muted-foreground text-[10.5px]">
              {step.sub}
            </T>
          </g>
        );
      })}

      <T x={148} y={38} anchor="middle" className="fill-muted-foreground text-[10.5px]">
        1 : N
      </T>
      <T x={290} y={38} anchor="middle" className="fill-muted-foreground text-[10.5px]">
        N : 1
      </T>
      <T x={432} y={38} anchor="middle" className="fill-muted-foreground text-[10.5px]">
        1 : N
      </T>
      <T x={574} y={38} anchor="middle" className="fill-muted-foreground text-[10.5px]">
        N : 1
      </T>

      <ArrowRight y={77} x1={138} x2={156} />
      <ArrowRight y={77} x1={280} x2={298} />
      <ArrowRight y={77} x1={422} x2={440} />
      <ArrowRight y={77} x1={564} x2={582} />

      <Box x={14} y={136} w={692} h={126} rx={12} dashed />
      {RBAC_NOTES.map((note, index) => (
        <T key={note} x={32} y={168 + index * 32} className="fill-muted-foreground text-[11px]">
          {note}
        </T>
      ))}
    </Frame>
  );
}

/* ====================== 5. 权限位掩码图 ====================== */

const PERMISSION_BITS = [
  { name: "SEARCH", cn: "搜索", value: 1 },
  { name: "ADD", cn: "新增", value: 2 },
  { name: "EDIT", cn: "编辑", value: 4 },
  { name: "DELETE", cn: "删除", value: 8 },
  { name: "BATCH_DELETE", cn: "批量删除", value: 16 },
  { name: "ADD_CHILD", cn: "新增子级", value: 32 },
  { name: "RESET", cn: "重置", value: 64 },
  { name: "RESET_PASSWORD", cn: "重置密码", value: 128 },
  { name: "GRANT", cn: "授权", value: 256 },
  { name: "EXPORT", cn: "导出", value: 512 },
];

export function PermissionBitsDiagram() {
  return (
    <Frame
      title="10 个权限点：每个占一个二进制位，十进制值即 2 的幂"
      viewBox="0 0 720 200"
    >
      <T x={6} y={16} className="fill-muted-foreground text-[10.5px]">
        bigint 位掩码 · 每位一个权限点，值 = 2 的幂
      </T>

      {PERMISSION_BITS.map((bit, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = 6 + col * 144;
        const y = 30 + row * 80;
        return (
          <g key={bit.name}>
            <Box x={x} y={y} w={136} h={62} />
            <T x={x + 12} y={y + 25} className="fill-foreground font-mono text-[10.5px] font-semibold">
              {bit.name}
            </T>
            <T x={x + 12} y={y + 47} className="fill-muted-foreground text-[10.5px]">
              {bit.cn}
            </T>
            <T x={x + 124} y={y + 47} anchor="end" className="fill-foreground font-mono text-[10.5px]">
              {bit.value}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* ====================== 6. 认证与吊销流程 ====================== */

const AUTH_STEPS = [
  {
    title: "登录 · 校验凭据",
    desc: "密码走 bcrypt 校验，通过后签发 accessToken 与 refreshToken",
    api: "POST /api/auth/login",
  },
  {
    title: "双 Token · 分级时效",
    desc: "accessToken 用于业务请求，refreshToken 用于续期；rememberMe 决定持久化档位",
    api: "POST /api/auth/refresh",
  },
  {
    title: "请求鉴权 · 服务端校验",
    desc: "校验签名、有效期与 ver 声明，再交给权限守卫做位掩码匹配",
    api: "Authorization: Bearer",
  },
  {
    title: "权限门控 · RBAC",
    desc: "PermissionsGuard 读取 @Permissions() 元数据，按位与匹配后方可进入处理器",
    api: "GET /api/users",
  },
  {
    title: "主动吊销 · token_version",
    desc: "登出 / 改密使 users.token_version 自增，JWT 的 ver 声明随之失配，旧 Token 全端失效",
    api: "POST /api/auth/logout",
  },
];

export function AuthFlowDiagram() {
  return (
    <Frame
      title="认证与吊销流程：登录签发双 Token、请求校验、token_version 主动吊销"
      viewBox="0 0 720 348"
    >
      <line
        x1={30}
        y1={34}
        x2={30}
        y2={296}
        className="stroke-border"
        strokeWidth={1.5}
      />

      {AUTH_STEPS.map((step, index) => {
        const y = 8 + index * 64;
        const cy = y + 28;
        return (
          <g key={step.title}>
            <circle cx={30} cy={cy} r={9} className="fill-card stroke-border" strokeWidth={1.5} />
            <T x={30} y={cy + 4} anchor="middle" className="fill-foreground text-[10px] font-semibold">
              {index + 1}
            </T>
            <Box x={70} y={y} w={630} h={56} />
            <T x={86} y={y + 24} className="fill-foreground text-[12px] font-semibold">
              {step.title}
            </T>
            <T x={86} y={y + 42} className="fill-muted-foreground text-[10.5px]">
              {step.desc}
            </T>
            <T x={684} y={y + 24} anchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {step.api}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* ====================== 7. API 响应信封图 ====================== */

export function ApiEnvelopeDiagram() {
  const panels = [
    {
      x: 10,
      title: "成功",
      status: "200",
      lines: ["{", '  "data": { ... }', "}"],
    },
    {
      x: 250,
      title: "列表",
      status: "200",
      lines: [
        "{",
        '  "data": [ ... ],',
        '  "pagination": {',
        '    "page": 1,',
        '    "pageSize": 20,',
        '    "total": 100',
        "  }",
        "}",
      ],
    },
    {
      x: 490,
      title: "失败",
      status: "4xx / 5xx",
      lines: [
        "{",
        '  "code": "USER_NOT_FOUND",',
        '  "message": "用户不存在"',
        "}",
      ],
    },
  ];

  return (
    <Frame
      title="统一响应信封：成功只包 data，列表附加 pagination，失败返回 code 与 message"
      viewBox="0 0 720 232"
    >
      {panels.map((panel) => (
        <g key={panel.title}>
          <Box x={panel.x} y={30} w={220} h={186} rx={12} />
          <T x={panel.x + 16} y={56} className="fill-foreground text-[12.5px] font-semibold">
            {panel.title}
          </T>
          <T x={panel.x + 204} y={56} anchor="end" className="fill-muted-foreground font-mono text-[10px]">
            {panel.status}
          </T>
          {panel.lines.map((line, index) => (
            <T
              key={line}
              x={panel.x + 16}
              y={82 + index * 18}
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {line}
            </T>
          ))}
        </g>
      ))}
    </Frame>
  );
}

/* =================== 8. 组件库优先级图 =================== */

const PRIORITY_COLUMNS = [
  {
    x: 10,
    header: "React / Next.js",
    rows: [
      ["1", "Hero UI", "@heroui/react"],
      ["2", "Shadcn UI", "仅作补充"],
      ["3", "项目级自定义", "最后兜底"],
    ],
  },
  {
    x: 364,
    header: "Vue / Nuxt",
    rows: [
      ["1", "Nuxt UI v4", "唯一组件库"],
      ["2", "项目级自定义", "官方未覆盖时"],
      ["3", "第三方组件", "须评审后引入"],
    ],
  },
];

export function ComponentPriorityDiagram() {
  return (
    <Frame
      title="组件库优先级：React / Next 用 Hero UI，Vue / Nuxt 用 Nuxt UI v4"
      viewBox="0 0 720 268"
    >
      {PRIORITY_COLUMNS.map((column) => (
        <g key={column.header}>
          <Box x={column.x} y={20} w={346} h={38} rx={10} muted />
          <T
            x={column.x + 173}
            y={44}
            anchor="middle"
            className="fill-foreground text-[12px] font-semibold"
          >
            {column.header}
          </T>
          {column.rows.map(([rank, name, note], index) => {
            const y = 74 + index * 58;
            return (
              <g key={name}>
                <Box x={column.x} y={y} w={346} h={48} />
                <circle
                  cx={column.x + 26}
                  cy={y + 24}
                  r={11}
                  className="fill-muted stroke-border"
                  strokeWidth={1}
                />
                <T
                  x={column.x + 26}
                  y={y + 28}
                  anchor="middle"
                  className="fill-foreground text-[10.5px] font-semibold"
                >
                  {rank}
                </T>
                <T x={column.x + 50} y={y + 22} className="fill-foreground text-[12px] font-semibold">
                  {name}
                </T>
                <T x={column.x + 50} y={y + 38} className="fill-muted-foreground text-[10px]">
                  {note}
                </T>
              </g>
            );
          })}
        </g>
      ))}

      <T x={10} y={256} className="fill-muted-foreground text-[10.5px]">
        禁止：同种基础组件跨页混用不同库 · 因熟悉某个库就默认使用 · 一次性大规模迁移
      </T>
    </Frame>
  );
}

/* =================== 9. Design Tokens 色板图 =================== */

const SWATCHES = [
  { token: "accent", cn: "品牌主色", varName: "--swatch-accent" },
  { token: "danger", cn: "危险 / 错误", varName: "--swatch-danger" },
  { token: "success", cn: "成功 / 通过", varName: "--swatch-success" },
  { token: "warning", cn: "警告 / 提醒", varName: "--swatch-warning" },
  { token: "foreground", cn: "正文文字", varName: "--swatch-foreground" },
  { token: "muted", cn: "次要文字", varName: "--swatch-muted" },
  { token: "background", cn: "页面底色", varName: "--swatch-background" },
  { token: "surface", cn: "卡片 / 浮层", varName: "--swatch-surface" },
  { token: "default", cn: "次级填充", varName: "--swatch-default" },
  { token: "border", cn: "描边 / 分隔", varName: "--swatch-border" },
];

export function TokenSwatchDiagram() {
  return (
    <Frame
      title="HeroUI Design Tokens 色板：品牌色、语义色与中性色"
      viewBox="0 0 720 246"
    >
      {SWATCHES.map((swatch, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);
        const x = 6 + col * 144;
        const chipY = 20 + row * 118;
        return (
          <g key={swatch.token}>
            <rect
              x={x}
              y={chipY}
              width={136}
              height={46}
              rx={9}
              strokeWidth={1}
              style={{ fill: `var(${swatch.varName})` }}
              className="stroke-border"
            />
            <T x={x} y={chipY + 70} className="fill-foreground font-mono text-[10.5px] font-semibold">
              {swatch.token}
            </T>
            <T x={x} y={chipY + 86} className="fill-muted-foreground text-[10.5px]">
              {swatch.cn}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

/* =================== 10. 各端数据流小图 =================== */

export function FrontendFlow({
  name,
  kind,
  stack,
}: {
  name: string;
  kind: "api" | "fullstack";
  stack: string;
}) {
  const middle =
    kind === "api"
      ? { title: "NestJS · REST API", sub: "统一契约 · Drizzle + pg" }
      : { title: "Server API（自实现）", sub: "与统一契约逐字一致" };

  return (
    <Frame
      title={`${name} 数据流：${kind === "api" ? "经 NestJS REST API" : "自实现 Server API"}访问 PostgreSQL`}
      viewBox="0 0 720 152"
    >
      <T x={20} y={22} className="fill-muted-foreground text-[10.5px]">
        {kind === "api"
          ? "纯前端：不直连数据库，全部数据经 NestJS REST API"
          : "全栈：不依赖 NestJS，自实现 Server API 直连数据库"}
      </T>

      <Box x={20} y={42} w={200} h={68} rx={10} />
      <T x={120} y={70} anchor="middle" className="fill-foreground text-[12px] font-semibold">
        {name}
      </T>
      <T x={120} y={90} anchor="middle" className="fill-muted-foreground text-[10px]">
        {stack}
      </T>

      <ArrowRight y={76} x1={220} x2={260} />

      <Box x={260} y={42} w={200} h={68} rx={10} />
      <T x={360} y={70} anchor="middle" className="fill-foreground text-[12px] font-semibold">
        {middle.title}
      </T>
      <T x={360} y={90} anchor="middle" className="fill-muted-foreground text-[10px]">
        {middle.sub}
      </T>

      <ArrowRight y={76} x1={460} x2={500} />

      <Box x={500} y={42} w={200} h={68} rx={10} />
      <T x={600} y={70} anchor="middle" className="fill-foreground text-[12px] font-semibold">
        PostgreSQL
      </T>
      <T x={600} y={90} anchor="middle" className="fill-muted-foreground text-[10px]">
        Supabase 托管 · 端口 6543
      </T>
    </Frame>
  );
}

/* =================== 11. 功能对齐状态图 =================== */

const MATRIX_ROWS = ["React", "Vue", "Next.js", "Nuxt"];
/** 功能矩阵计数（真源：docs/feature-matrix.md 按行实测 29 项，四端均已对齐） */
const MATRIX_TOTAL = 29;
const MATRIX_DONE = 29;

export function FeatureMatrixDiagram() {
  const barX = 110;
  const barW = 470;
  const filled = Math.round((barW * MATRIX_DONE) / MATRIX_TOTAL);

  return (
    <Frame
      title={`功能对齐状态：四个前端均为 ${MATRIX_DONE} / ${MATRIX_TOTAL} 项，功能已全部对齐`}
      viewBox="0 0 720 268"
    >
      {MATRIX_ROWS.map((name, index) => {
        const y = 20 + index * 40;
        return (
          <g key={name}>
            <T x={16} y={y + 16} className="fill-foreground text-[12px] font-semibold">
              {name}
            </T>
            <rect
              x={barX}
              y={y + 7}
              width={barW}
              height={10}
              rx={5}
              className="fill-muted"
            />
            <rect
              x={barX}
              y={y + 7}
              width={filled}
              height={10}
              rx={5}
              className="fill-foreground"
            />
            <T x={700} y={y + 16} anchor="end" className="fill-muted-foreground font-mono text-[10.5px]">
              {MATRIX_DONE} / {MATRIX_TOTAL}
            </T>
          </g>
        );
      })}

      <Box x={20} y={182} w={680} h={80} rx={12} dashed />
      <T x={38} y={206} className="fill-foreground text-[12px] font-semibold">
        两处有意保留的架构差异（不算功能缺失）
      </T>
      {/* SVG text 不自动换行：长句必须手动拆行，否则溢出 viewBox 被裁断 */}
      <T x={38} y={224} className="fill-muted-foreground text-[10.5px]">
        Next.js 无页面保活（App Router 无等价原语）
      </T>
      <T x={38} y={240} className="fill-muted-foreground text-[10.5px]">
        认证载体不同（React/Vue 走 Bearer，Next 走 httpOnly Cookie）· 契约完全一致
      </T>
    </Frame>
  );
}

/* =================== 12. 路线图时间线 =================== */

const ROADMAP = [
  { x: 110, phase: "Phase A", status: "✅ 已完成", note: "09-14", done: true, desc: ["菜单树录入", "+ 四端占位"] },
  { x: 280, phase: "Phase B", status: "✅ 已完成", note: "09-16", done: true, desc: ["React 基准", "→ 四端对齐（10 页）"] },
  { x: 450, phase: "Phase 0", status: "✅ 已完成", note: "09-18", done: true, desc: ["只读守卫 / 快捷登录", "契约 v1.10.0"] },
  { x: 620, phase: "Phase C", status: "✅ 已完成", note: "09-19", done: true, desc: ["KPI + 趋势图", "契约 v1.12.0"] },
];

export function RoadmapDiagram() {
  return (
    <Frame
      title="路线图：演示场两阶段 + Phase 0 演示准备 + Phase C 概览均已完成，下一步统一上线"
      viewBox="0 0 720 214"
    >
      <line
        x1={40}
        y1={100}
        x2={280}
        y2={100}
        className="stroke-muted-foreground"
        strokeWidth={1.5}
      />
      <line
        x1={280}
        y1={100}
        x2={690}
        y2={100}
        className="stroke-border"
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />

      {ROADMAP.map((item) => (
        <g key={item.phase}>
          <circle
            cx={item.x}
            cy={100}
            r={8}
            className={item.done ? "fill-foreground" : "fill-card stroke-border"}
            strokeWidth={1.5}
          />
          <T x={item.x} y={62} anchor="middle" className="fill-foreground text-[12px] font-semibold">
            {item.phase}
          </T>
          <T x={item.x} y={132} anchor="middle" className="fill-muted-foreground text-[10.5px]">
            {item.status}
          </T>
          {item.desc.map((line, index) => (
            <T
              key={line}
              x={item.x}
              y={154 + index * 16}
              anchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {line}
            </T>
          ))}
        </g>
      ))}

      <line
        x1={365}
        y1={84}
        x2={365}
        y2={116}
        className="stroke-border"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <T x={365} y={76} anchor="middle" className="fill-muted-foreground text-[9.5px]">
        Gate（已过）
      </T>
    </Frame>
  );
}

/* =================== 13. 快速开始流程 =================== */

const QUICK_STEPS = [
  { title: "安装依赖", l1: "pnpm install", l2: "进入各应用目录执行" },
  { title: "配置环境变量", l1: ".env.example → .env.local", l2: "密钥不入仓库" },
  { title: "初始化数据库", l1: "pnpm db:migrate", l2: "pnpm db:seed（Nest 端）" },
  { title: "启动", l1: "pnpm dev", l2: "5173 / 5174 / 3000 …" },
];

export function QuickStartFlow() {
  return (
    <div className="overflow-x-auto">
      {/* 小屏下保持可读字号，横向滑动查看；桌面端不受影响（≤720px 全宽显示） */}
      <div className="min-w-[560px]">
        <QuickStartFlowSvg />
      </div>
    </div>
  );
}

function QuickStartFlowSvg() {
  return (
    <Frame
      title="快速开始四步：安装依赖、配置环境变量、初始化数据库、启动"
      viewBox="0 0 720 168"
    >
      {QUICK_STEPS.map((step, index) => {
        const x = 16 + index * 176;
        const y = 44;
        return (
          <g key={step.title}>
            <Box x={x} y={y} w={160} h={84} rx={10} />
            <circle cx={x + 24} cy={y + 24} r={11} className="fill-muted stroke-border" strokeWidth={1} />
            <T x={x + 24} y={y + 28} anchor="middle" className="fill-foreground text-[10.5px] font-semibold">
              {index + 1}
            </T>
            <T x={x + 44} y={y + 28} className="fill-foreground text-[12px] font-semibold">
              {step.title}
            </T>
            <T x={x + 14} y={y + 56} className="fill-muted-foreground font-mono text-[9.5px]">
              {step.l1}
            </T>
            <T x={x + 14} y={y + 72} className="fill-muted-foreground text-[10px]">
              {step.l2}
            </T>
            {index < QUICK_STEPS.length - 1 ? (
              <ArrowRight y={y + 42} x1={x + 160} x2={x + 176} />
            ) : null}
          </g>
        );
      })}
    </Frame>
  );
}
