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

/**
 * 数据表分域总览（HTML 卡片网格）
 *
 * 前身是 diagrams.tsx 里一张固定 viewBox 的 SVG：五列等宽等高灰卡在宽屏内容区里
 * 只占一半宽、短域卡片下方大片留白、表名一行一个拖垮信息密度。改为真 DOM 网格：
 * 宽度随内容区伸缩，窄屏自动降列（默认 1 列 / sm 2 列 / lg 3 列 / 2xl 5 列——
 * 5 列卡内约 156px，恰好容下最长的 `notice_read_records` chip，断点提前会在卡内溢出）；
 * 表名以 chip 流式排列（短名并排、长名单行），各域卡片高度随表数自适应，
 * `items-start` 不做同行等高拉伸——等高会让短域卡内重新出现大片空白。
 *
 * 样式全部走 globals.css `@theme inline` 的语义 token（bg-card / bg-muted /
 * border / text-muted-foreground），亮暗主题自动适配。表名刻意用 `<span class="font-mono">`
 * 而非 `<code>`——prose 对行内代码有默认底色与边框，会叠在 chip 样式上；
 * 根节点加 `not-prose` 并全部用 div/span，彻底绕开 prose 的元素级样式。
 */
export function TableGroupsDiagram() {
  const total = TABLE_GROUPS.reduce(
    (sum, group) => sum + group.tables.length,
    0,
  );

  return (
    <div className="not-prose">
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {TABLE_GROUPS.map((group) => (
          <div
            key={group.title}
            className="overflow-hidden rounded-xl border bg-card"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
              <span className="text-[13px] font-semibold text-foreground">
                {group.title}
              </span>
              <span className="rounded-full bg-muted-foreground/10 px-1.5 py-px font-mono text-[10.5px] leading-4 text-muted-foreground">
                {group.tables.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {group.tables.map((table) => (
                <span
                  key={table}
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        共 {total} 张表 · 全部由 Drizzle ORM 定义，四端共用
      </p>
    </div>
  );
}
