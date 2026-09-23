import {
  ArrowRight,
  BookOpen,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/brand-icons";
import { ButtonLink } from "@/components/motion/button/base";
import { SITE } from "@/lib/site";

/**
 * 仿 Admin 界面的窗口（纯 CSS，产品视觉锚点）
 *
 * 刻意**不用真实截图**：四端 UI 各自演化，截谁都不公平，而且每次改 UI 都要重截一次。
 * 这里用灰阶复刻一个"像真的后台"：真实菜单名 + 表头 + 状态胶囊 + 分页，
 * 一眼能认出这是管理系统，而不是"图没加载出来"。
 * 纯装饰，整块 `aria-hidden` + `pointer-events-none`，不参与交互与无障碍树。
 */
const NAV_GROUPS = [
  {
    label: "概览",
    items: [{ icon: LayoutDashboard, label: "仪表盘", active: false }],
  },
  {
    label: "系统管理",
    items: [
      { icon: Users, label: "用户管理", active: true },
      { icon: ShieldCheck, label: "角色管理", active: false },
      { icon: KeyRound, label: "权限管理", active: false },
      { icon: FolderTree, label: "菜单管理", active: false },
      { icon: ScrollText, label: "操作日志", active: false },
    ],
  },
];

const ROWS = [
  { name: "张伟", role: "超级管理员", enabled: true, time: "2026-09-16" },
  { name: "李娜", role: "运营管理员", enabled: true, time: "2026-09-14" },
  { name: "王强", role: "普通用户", enabled: true, time: "2026-09-11" },
  { name: "陈静", role: "普通用户", enabled: false, time: "2026-09-08" },
  { name: "刘洋", role: "访客", enabled: true, time: "2026-09-02" },
];

/** 表格列宽：用户 / 角色 / 状态 / 创建时间 */
const GRID = "grid grid-cols-[1.4fr_1fr_0.7fr_0.9fr] items-center gap-3";

function AdminMockup() {
  const host = SITE.url.replace(/^https?:\/\//, "");

  return (
    <div
      aria-hidden
      className="pointer-events-none mx-auto mt-20 max-w-4xl select-none"
    >
      <div className="animate-fade-up-delay-4">
        <div className="window-premium overflow-hidden rounded-2xl text-left">
          {/* Mac 风窗口条：左上角红黄绿交通灯 + 居中地址栏（正常平视展示，无倾斜） */}
          <div className="flex items-center gap-2.5 border-b bg-muted/40 px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
            <span className="size-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
            <span className="size-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
            <span className="ms-3 flex h-5 flex-1 items-center justify-center rounded-full bg-background/80 text-[10px] text-muted-foreground/70">
              {host}/users
            </span>
          </div>

          <div className="flex">
            {/* 侧边栏 */}
            <div className="hidden w-44 shrink-0 border-e p-3 sm:block">
              <div className="mb-1 flex items-center gap-2 px-2 py-1">
                <span className="grid size-5 place-items-center rounded-md bg-foreground text-[9px] font-bold text-background">
                  B
                </span>
                <span className="text-[11px] font-semibold text-foreground/85">
                  Better Admin
                </span>
              </div>
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pt-2.5 pb-1 text-[9px] tracking-wide text-muted-foreground/60">
                    {group.label}
                  </p>
                  {group.items.map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                        active
                          ? "bg-foreground/[0.07] font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon size={12} className="shrink-0" />
                      {label}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 主区 */}
            <div className="min-w-0 flex-1 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-foreground/85">
                  用户管理
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 items-center gap-1.5 rounded-md border px-2 text-[10px] text-muted-foreground/70">
                    <Search size={10} />
                    搜索用户名
                  </span>
                  <span className="flex h-6 items-center gap-1 rounded-md bg-foreground px-2.5 text-[10px] font-medium text-background">
                    <Plus size={10} />
                    新建用户
                  </span>
                </div>
              </div>

              <div
                className={`${GRID} border-y px-1 py-2 text-[10px] font-medium text-muted-foreground/80`}
              >
                <span>用户</span>
                <span>角色</span>
                <span>状态</span>
                <span className="text-right">创建时间</span>
              </div>

              {ROWS.map((row) => (
                <div
                  key={row.name}
                  className={`${GRID} border-b px-1 py-2 text-[11px] last:border-b-0`}
                >
                  <span className="flex items-center gap-2 text-foreground/80">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-foreground/10 text-[8px] font-semibold text-foreground/60">
                      {row.name.slice(0, 1)}
                    </span>
                    {row.name}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {row.role}
                  </span>
                  <span>
                    {row.enabled ? (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium text-background">
                        启用
                      </span>
                    ) : (
                      <span className="rounded-full border px-2 py-0.5 text-[9px] text-muted-foreground/70">
                        停用
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-[10px] text-muted-foreground/80">
                    {row.time}
                  </span>
                </div>
              ))}

              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground/70">
                <span>共 128 条 · 每页 20 条</span>
                <span className="flex items-center gap-1">
                  <span className="rounded border px-1.5 py-0.5">上一页</span>
                  <span className="rounded bg-foreground px-1.5 py-0.5 font-medium text-background">
                    1
                  </span>
                  <span className="rounded border px-1.5 py-0.5">2</span>
                  <span className="rounded border px-1.5 py-0.5">3</span>
                  <span className="rounded border px-1.5 py-0.5">下一页</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-24 text-center">
      {/* 极淡点阵材质，只在主视觉背后可见 */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60"
      />
      <div className="relative">
        <a
          href={SITE.github}
          target="_blank"
          rel="noreferrer"
          className="animate-fade-up group mx-auto mb-6 flex w-fit items-center gap-3 rounded-full border bg-background/80 p-1 ps-4 text-xs font-medium text-muted-foreground shadow-md backdrop-blur transition-colors duration-300 hover:bg-muted hover:text-foreground"
        >
          <span>同一套产品 · 五种技术栈实现</span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          {/* 箭头循环滑入：两支箭头错开一个圆宽，悬停时整体右移，视觉上无限推进 */}
          <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-muted transition-colors group-hover:bg-background">
            <ArrowRight className="absolute inset-0 m-auto size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-6" />
            <ArrowRight className="absolute inset-0 m-auto size-3.5 -translate-x-6 transition-transform duration-300 ease-out group-hover:translate-x-0" />
          </span>
        </a>
        <h1 className="animate-fade-up-delay-1 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          一套 Admin 系统
          <br />
          五种技术栈实现
        </h1>
        <p className="animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用
          React、Vue、Next.js、Nuxt 与 NestJS 独立实现。
        </p>
        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/docs">
            <BookOpen size={16} />
            阅读文档
          </ButtonLink>
          <ButtonLink
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
          >
            <GithubIcon className="size-4" />
            GitHub
          </ButtonLink>
        </div>
        <AdminMockup />
      </div>
    </section>
  );
}
