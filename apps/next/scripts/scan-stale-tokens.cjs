/* 临时排查脚本：扫描 react/src 中的失效颜色 token 类名（v2 残留等） */
const fs = require("fs");
const path = require("path");

const ROOT = "F:/projects/better-admin/next/src";

// HeroUI v3 @theme inline 桥接的全部颜色 token（heroui/styles/dist/themes/shared/theme.css）
const WHITELIST = new Set(
  `accent accent-foreground accent-hover accent-soft accent-soft-foreground accent-soft-hover
   backdrop background background-inverse background-secondary background-tertiary
   border border-secondary border-tertiary
   danger danger-foreground danger-hover danger-soft danger-soft-foreground danger-soft-hover
   default default-foreground default-hover default-soft default-soft-foreground default-soft-hover
   field field-border field-border-focus field-border-hover field-focus field-foreground field-hover field-placeholder
   focus foreground link muted overlay overlay-foreground
   segment segment-foreground
   separator separator-secondary separator-tertiary
   success success-foreground success-hover success-soft success-soft-foreground success-soft-hover
   surface surface-foreground surface-hover surface-secondary surface-secondary-foreground surface-tertiary surface-tertiary-foreground
   warning warning-foreground warning-hover warning-soft warning-soft-foreground warning-soft-hover`.split(/\s+/).filter(Boolean),
);

// Tailwind v4 内置色板名（带/不带数字色阶都合法）
const TW_PALETTES = new Set(
  `slate gray zinc neutral stone red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose black white transparent inherit current`.split(/\s+/),
);

// 颜色类前缀（Tailwind 中承载颜色的 utilities）
const COLOR_PREFIXES = new Set([
  "bg", "text", "border", "ring", "fill", "stroke", "from", "via", "to",
  "divide", "accent", "caret", "placeholder", "decoration", "outline",
  "ring-offset", "shadow", "inset-shadow", "border-t", "border-b", "border-l", "border-r",
  "border-x", "border-y", "border-s", "border-e",
]);

// 每个前缀下的非颜色后缀（尺寸 / 样式 / 定位等），命中即跳过
const NON_COLOR = new Set([
  // 通用
  "none", "clip", "origin", "auto", "fixed", "local", "scroll", "repeat", "no-repeat",
  "round", "space", "line", "alpha", "opacity",
  // bg
  "cover", "contain", "center", "top", "bottom", "left", "right", "linear", "radial", "conic",
  "gradient", "to", "bottom-left", "bottom-right", "top-left", "top-right",
  "size", "position", "image", "attachment", "boxes", "border-box", "padding-box", "content-box",
  // text
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
  "left", "center", "right", "justify", "start", "end", "wrap", "nowrap", "balance", "pretty",
  "upper", "lower", "capitalize", "normal-case", "italic", "underline", "overline", "line-through",
  "no-underline", "truncate", "pretty", "transform", "primary", "secondary",
  // border / divide / outline
  "solid", "dashed", "dotted", "double", "hidden", "collapse", "separate", "spacing",
  "t", "b", "l", "r", "x", "y", "s", "e", "inline", "block", "box",
  "offset", "radius", "width", "widths", "style",
  // outline / ring
  "ring", "hidden",
  // shadow（阴影尺寸 token）
  "sm", "md", "inner", "2xs", "xs",
  // fill / stroke
  "even", "odd",
  // decoration
  "clone", "slice", "fill", "stroke", "auto", "from-font", "underline", "wavy", "dotted",
  // misc
  "clamp", "scale", "flip", "label",
]);

// 数字 / 数字色阶（text-sm/4、bg-red-500/50、ring-2 等直接处理）
function isTwPalette(token) {
  const base = token.replace(/\/.*$/, "");
  if (TW_PALETTES.has(base)) return true;
  const m = base.match(/^([a-z]+)-(\d{2,3})$/);
  return m ? TW_PALETTES.has(m[1]) : false;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const results = [];
for (const file of walk(ROOT, [])) {
  const text = fs.readFileSync(file, "utf8");
  const isCss = file.endsWith(".css");
  // tsx/ts：提取引号字符串内全部词元（覆盖多行 cn()/className 拼接）；
  // css：只查 @apply 行（其余 CSS 无 Tailwind 类名）
  const chunks = isCss
    ? text.split("\n").filter((l) => l.includes("@apply"))
    : (text.match(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g) ?? []);
  chunks.forEach((chunk) => {
    const lineNo = isCss
      ? text.slice(0, text.indexOf(chunk)).split("\n").length
      : text.slice(0, text.indexOf(chunk)).split("\n").length;
    for (const word of chunk.split(/[\s"'`]+/)) {
      // 剥离修饰符前缀（hover: data-[x]: md: dark: 等）与 important 后缀 !
      let bare = word.includes(":") ? word.split(":").pop() : word;
      bare = bare.replace(/[;!,]+$/, "");
      if (!bare || bare.startsWith("[") || bare.startsWith("(")) continue;
      // 按枚举前缀匹配（正则 [a-z-]+ 会贪婪吞掉 token 首段，如 text-default-500）
      const prefix = [...COLOR_PREFIXES]
        .sort((a, b) => b.length - a.length)
        .find((p) => bare.startsWith(`${p}-`));
      if (!prefix) continue;
      let token = bare.slice(prefix.length + 1);
      // 排除括号任意值 / CSS 变量 / 渐变函数式
      if (token.startsWith("[") || token.startsWith("(") || token.startsWith("linear") || token.startsWith("radial") || token.startsWith("conic")) continue;
      // 剥透明度后缀 content1/60 → content1
      token = token.replace(/\/\d+$/, "");
      // 数字 / 数字+单位（border-2、text-[13px] 已排除、leading-4）
      if (/^\d+(?:\.\d+)?(?:px|rem|em|%|xl)?$/.test(token)) continue;
      // 2xl 这类带数字的尺寸
      if (/^(?:2|3|4|5|6|7|8|9)?xl$/.test(token)) continue;
      if (NON_COLOR.has(token)) continue;
      // Tailwind 内置色板
      if (isTwPalette(token)) continue;
      if (WHITELIST.has(token)) continue;
      results.push({ file: file.replace(/\\/g, "/"), line: lineNo, cls: bare, token });
    }
  });
}

// 汇总去重输出
const seen = new Map();
for (const r of results) {
  const key = `${r.cls}`;
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(`${r.file}:${r.line}`);
}
for (const [cls, locs] of [...seen.entries()].sort()) {
  console.log(`${cls}  (${locs.length}处)`);
  for (const l of locs.slice(0, 5)) console.log(`    ${l}`);
}
console.log(`\n共 ${seen.size} 种可疑类名`);
