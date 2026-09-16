/**
 * 从 Simple Icons 官方 SVG 生成 components/icons/stack-icons.tsx
 *
 * 为什么不让它自己下载：构建链不该访问外网。需要重新生成（比如加一个新技术栈）时，
 * 先把官方 SVG 拉到本地临时目录，再对那个目录跑本脚本：
 *
 *   mkdir -p /tmp/si && cd /tmp/si
 *   for s in react vuedotjs nextdotjs nuxt nestjs; do curl -s "https://cdn.simpleicons.org/$s" -o "$s.svg"; done
 *   cd "<website>" && node scripts/gen-stack-icons.mjs "<svg 目录的绝对路径>"
 *
 * 生成结果直接提交进仓库，日常构建完全不依赖本脚本。
 * 只做一件事：抽 `<path d="...">` 内联进一个 TSX 文件，避免手工转写长路径出错。
 * 品牌图标来自 Simple Icons（CC0 1.0 Universal，公共领域）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIR = process.argv[2];
if (!SOURCE_DIR) throw new Error("请传入存放 SVG 的目录");

/** 输出顺序即 StackTabs 里的图标顺序；label 用于在 Tab 文案里做包含匹配 */
const STACKS = [
  { key: "react", label: "React", file: "react.svg" },
  { key: "vue", label: "Vue", file: "vuedotjs.svg" },
  { key: "nextjs", label: "Next.js", file: "nextdotjs.svg" },
  { key: "nuxt", label: "Nuxt", file: "nuxt.svg" },
  { key: "nestjs", label: "NestJS", file: "nestjs.svg" },
];

const paths = STACKS.map(({ key, file }) => {
  const svg = readFileSync(join(SOURCE_DIR, file), "utf8");
  const d = svg.match(/<path d="([^"]+)"/)?.[1];
  if (!d) throw new Error(`${file} 未找到 path`);
  return { key, d };
});

const dBlocks = paths
  .map(({ key, d }) => `  ${key}:\n    "${d}",`)
  .join("\n");

const labelBlocks = STACKS.map(
  ({ key, label }) => `  { stack: "${key}", label: "${label}" },`,
).join("\n");

const out = `import type { SVGProps } from "react";

/**
 * 技术栈品牌图标（单色，继承 currentColor）
 *
 * 路径取自 Simple Icons（CC0 1.0 Universal，公共领域），由
 * \`scripts/gen-stack-icons.mjs\` 从官方 SVG 抽取内联：
 * 只装 5 个真正用到的品牌，避免为几枚图标引入整个图标库依赖。
 * viewBox 统一 \`0 0 24 24\`，尺寸交给外部 class（fumadocs Tabs 已内置 \`[&_svg]:size-4\`）。
 */
const STACK_PATHS = {
${dBlocks}
} as const;

export type StackKey = keyof typeof STACK_PATHS;

/** 可被 Tab 文案识别的技术栈清单；顺序即渲染顺序 */
export const STACK_ICON_ENTRIES: { stack: StackKey; label: string }[] = [
${labelBlocks}
];

export function StackGlyph({
  stack,
  ...props
}: { stack: StackKey } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d={STACK_PATHS[stack]} />
    </svg>
  );
}
`;

writeFileSync(
  join(process.cwd(), "components/icons/stack-icons.tsx"),
  out,
  "utf8",
);
console.log("已生成 components/icons/stack-icons.tsx");
