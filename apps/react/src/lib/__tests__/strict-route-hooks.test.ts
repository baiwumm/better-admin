import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * KeepAlive 实例池 × TanStack Router 严格匹配守卫（docs/mechanisms.md §10）。
 *
 * 池内叶子路由组件（及整棵子树）脱离路由树 MatchContext 常驻渲染，在
 * 「match 已移除但组件仍在渲染」的窗口（导航过渡帧 / hidden 保活被动
 * 重渲染）内，严格匹配 hook 会抛 “Could not find an active match”，
 * 被 CatchBoundary 捕获后表现为点击菜单跳转 500。
 *
 * 本测试静态扫描池内组件可能出现的源码范围，拦截三类违规：
 * 1. Route.useXxx() —— 绑定具体 routeId 的严格读取（会抛错）；
 * 2. useXxx({ from }) —— 显式 from 的严格读取（会抛错；shouldThrow: false 的
 *    宽松读法放行，正则按「含 from 且不含 shouldThrow」判定）；
 * 3. 无参 useParams() —— 池内读到的是布局层 params（恒空对象），静默取值
 *    bug，统一改 useSearchParams 语义的 useParams({ strict: false })。
 *
 * (auth) 布局页面（登录页等）不入实例池，不在扫描范围，可正常使用严格匹配。
 */

const SCAN_DIRS = [
  "src/routes/_authenticated",
  "src/features",
  "src/layouts",
  "src/hooks",
  "src/components",
];

const EXTENSIONS = new Set([".ts", ".tsx"]);

const ROUTE_BOUND_HOOK =
  /\bRoute\.use(?:Search|Params|Match|RouteContext|LoaderData|LoaderDeps)\s*\(/;

const EXPLICIT_FROM =
  /\buse(?:Search|Params|Match|RouteContext|LoaderData|LoaderDeps)\s*\(\s*\{(?![^}]*shouldThrow)[^}]*\bfrom\s*:/;

const BARE_USE_PARAMS = /\buseParams\s*\(\s*\)/;

/** 剥离块注释与行内注释（规避 my-notices / directory 注释中的用语误报）。 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:"'])\/\/.*$/, "$1"))
    .join("\n");
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name);

    if (item.isDirectory()) return listFiles(full);

    return EXTENSIONS.has(item.name.slice(item.name.lastIndexOf(".")))
      ? [full]
      : [];
  });
}

type Violation = { file: string; line: number; text: string };

function findViolations(
  file: string,
  source: string,
  pattern: RegExp,
): Violation[] {
  return stripComments(source)
    .split("\n")
    .flatMap((line, index) =>
      pattern.test(line)
        ? [{ file, line: index + 1, text: line.trim().slice(0, 120) }]
        : [],
    );
}

const files = SCAN_DIRS.flatMap(listFiles);
const violations = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");

  return [
    ...findViolations(file, source, ROUTE_BOUND_HOOK),
    ...findViolations(file, source, EXPLICIT_FROM),
    ...findViolations(file, source, BARE_USE_PARAMS),
  ];
});

describe("KeepAlive 池内严格路由 hook 守卫", () => {
  it("扫描范围非空（目录漂移时守卫失效）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("池内源码禁止严格匹配 hook（Route.useXxx / useXxx({ from }) / 无参 useParams）", () => {
    const report = violations
      .map(
        ({ file, line, text }) =>
          `${file}:${line}  ${text}\n  → 池内组件须用 strict: false 全局读取，机制见 docs/mechanisms.md §10`,
      )
      .join("\n");

    expect(report).toBe("");
  });

  it("拦截规则自检：违规样例命中、合法写法放行", () => {
    // 违规样例必须逐一命中（防正则失效守卫形同虚设）。
    const offenders = [
      "const { deptId } = Route.useSearch();",
      "const { noticeId } = Route.useParams();",
      "const match = Route.useMatch();",
      "const ctx = Route.useRouteContext();",
      "const data = Route.useLoaderData();",
      "const search = useSearch({ from: '/_authenticated/x' });",
      "const params = useParams({ from: '/_authenticated/x' });",
      "const params = useParams()",
    ];

    for (const code of offenders) {
      expect(
        ROUTE_BOUND_HOOK.test(code) ||
          EXPLICIT_FROM.test(code) ||
          BARE_USE_PARAMS.test(code),
        code,
      ).toBe(true);
    }

    // 合法写法必须全部放行（防误伤）。
    const allowed = [
      "const { deptId } = useSearch({ strict: false });",
      "const { noticeId } = useParams({ strict: false });",
      "const match = useMatch({ from: '/x', shouldThrow: false });",
      "const search = useSearch();",
      "// Route.useSearch() 的严格匹配会抛错（注释不误报）",
      "const url = 'https://example.com';",
    ];

    for (const code of allowed) {
      const stripped = stripComments(code);

      expect(
        ROUTE_BOUND_HOOK.test(stripped) ||
          EXPLICIT_FROM.test(stripped) ||
          BARE_USE_PARAMS.test(stripped),
        code,
      ).toBe(false);
    }
  });
});
