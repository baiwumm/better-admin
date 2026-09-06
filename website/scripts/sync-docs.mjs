#!/usr/bin/env node
/**
 * 同步仓库文档到 website/content，作为文档站的唯一内容来源。
 *
 * 设计原则（见 AGENTS §13 文档体系）：
 * - `docs/` 是真源，本脚本产物 `content/` 已 gitignore，禁止在 content 里直接改内容；
 * - dev / build 前自动执行（package.json scripts 已串联），保证网站内容与仓库文档一致；
 * - 注入 frontmatter（title/description）、重写内部相对链接为站内路由、
 *   生成 meta.json（sidebar 结构）与 /docs 概览页。
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(websiteRoot, "..");
const contentDir = join(websiteRoot, "content");

/** 文档映射：仓库源文件 → 站内路由与展示信息 */
const DOCS_MAP = [
  {
    src: "AGENTS.md",
    route: "guide/agents",
    title: "开发指南",
    description:
      "Better Admin 的硬性开发规则、多技术栈协作约定与阶段性开发流程。",
  },
  {
    src: "docs/requirements.md",
    route: "guide/requirements",
    title: "需求总览",
    description: "产品定位、项目目标、技术栈职责、数据库与 API 架构要求。",
  },
  {
    src: "docs/ui-spec.md",
    route: "design/ui-spec",
    title: "UI 规范",
    description: "设计语言、Design Tokens、组件行为与页面结构规范。",
  },
  {
    src: "nest/docs/database-design.md",
    route: "backend/database-design",
    title: "数据库设计",
    description: "PostgreSQL Schema、Drizzle ORM 数据模型与权限位掩码设计。",
  },
  {
    src: "nest/docs/openapi-design.md",
    route: "backend/openapi-design",
    title: "API 设计",
    description: "RESTful API Contract 设计约定与 OpenAPI 规范说明。",
  },
  {
    src: "docs/react.md",
    route: "frontends/react/index",
    title: "React 实现",
    description: "React 版本（UI Source of Truth）的项目结构与实现说明。",
  },
  {
    src: "docs/routing.md",
    route: "frontends/react/routing",
    title: "路由说明",
    description: "React 版本的路由组织、权限守卫与导航约定。",
  },
  {
    src: "docs/react-performance.md",
    route: "frontends/react/performance",
    title: "性能规范",
    description: "Vercel 官方 React Skills 的项目适用政策与性能规范。",
  },
  {
    src: "docs/vue-plan.md",
    route: "frontends/vue/index",
    title: "Vue 实现计划",
    description: "Vue + Nuxt UI 版本的迁移计划与进度安排。",
  },
  {
    src: "docs/nuxt-ui-guide.md",
    route: "frontends/vue/nuxt-ui-guide",
    title: "Nuxt UI 指南",
    description: "Nuxt UI v4 组件优先级、Dashboard 套件与 HeroUI 对照。",
  },
  {
    src: "docs/feature-matrix.md",
    route: "progress/feature-matrix",
    title: "功能矩阵",
    description: "四种前端实现的功能对齐状态追踪。",
  },
  {
    src: "docs/progress.md",
    route: "progress/log",
    title: "进度记录",
    description: "按时间倒序的阶段进度日志：做了什么、关键决策、已知限制。",
  },
  {
    src: "docs/mechanisms.md",
    route: "progress/mechanisms",
    title: "机制沉淀",
    description: "代码行为的技术结论与可复用机制（以代码为准）。",
  },
  {
    src: "docs/code-review-backlog.md",
    route: "progress/backlog",
    title: "代码评审待办",
    description: "代码评审发现的待处理事项清单。",
  },
];

/** sidebar 结构：目录 → meta.json 内容；空串代表根 meta.json */
const META = {
  "": {
    title: "Better Admin 文档",
    pages: ["index", "guide", "design", "backend", "frontends", "progress"],
  },
  guide: { title: "指南", pages: ["requirements", "agents"] },
  design: { title: "设计", pages: ["ui-spec"] },
  backend: { title: "后端", pages: ["database-design", "openapi-design"] },
  frontends: { title: "前端实现", pages: ["react", "vue"] },
  "frontends/react": {
    title: "React",
    pages: ["index", "routing", "performance"],
  },
  "frontends/vue": { title: "Vue", pages: ["index", "nuxt-ui-guide"] },
  progress: {
    title: "进展",
    pages: ["feature-matrix", "log", "mechanisms", "backlog"],
  },
};

/** /docs 概览页（脚本生成，不对应仓库源文件） */
const INDEX_MDX = `---
title: 概览
description: Better Admin 项目文档总览与导航。
---

Better Admin 是一套使用 **React、Vue、Next.js、Nuxt、NestJS** 分别实现的全栈 Admin 系统——同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，各技术栈独立实现、独立部署。

<Cards>

  <Card href="/docs/guide/requirements" title="需求总览" description="产品定位、项目目标与技术栈职责" />

  <Card href="/docs/guide/agents" title="开发指南" description="硬性开发规则与多技术栈协作约定" />

  <Card href="/docs/design/ui-spec" title="UI 规范" description="设计语言、Design Tokens 与组件行为规范" />

  <Card href="/docs/backend/database-design" title="数据库设计" description="PostgreSQL Schema 与 Drizzle ORM 数据模型" />

  <Card href="/docs/backend/openapi-design" title="API 设计" description="RESTful Contract 与 OpenAPI 规范" />

  <Card href="/docs/frontends/react" title="React 实现" description="UI Source of Truth 的项目结构与路由" />

  <Card href="/docs/frontends/vue" title="Vue 实现计划" description="Vue + Nuxt UI 版本的迁移计划" />

  <Card href="/docs/progress/feature-matrix" title="功能矩阵" description="四种前端实现的功能对齐状态" />

  <Card href="/docs/progress/log" title="进度记录" description="按时间倒序的阶段进度日志" />

</Cards>
`;

const warnings = [];

function stripHtmlComments(md) {
  return md.replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * MDX 字符安全化：围栏代码块与行内代码之外的裸 `<`、`{` 会被 MDX 当作
 * JSX 语法解析（如 progress.md 中的 "<6 位直接极弱"），统一转义为 HTML 实体。
 * 文档真源均为纯 Markdown（无 HTML 标签 / JSX 组件），转义无视觉副作用。
 */
function escapeMdxText(md) {
  const fencedPattern = /(^```[\s\S]*?^```|```[\s\S]*?```|~~~[\s\S]*?~~~)/gm;
  return md
    .split(fencedPattern)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part
        .split(/(`[^`\n]*`)/g)
        .map((span, spanIndex) =>
          spanIndex % 2 === 1
            ? span
            : span.replace(/</g, "&lt;").replace(/\{/g, "&#123;"),
        )
        .join("");
    })
    .join("");
}

/** 把指向文档映射内文件的相对链接重写为站内路由 */
function rewriteLinks(md, srcRel) {
  const srcDir = dirname(join(repoRoot, srcRel));
  return md.replace(/\]\(([^)\s]+)([^)]*)\)/g, (full, href, rest) => {
    if (/^(https?:|mailto:|\/\/|#)/i.test(href)) return full;
    const hashIndex = href.indexOf("#");
    const pathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const anchor = hashIndex >= 0 ? href.slice(hashIndex) : "";
    if (!pathPart) return full;
    const candidates = [resolve(srcDir, pathPart), resolve(repoRoot, pathPart)];
    for (const candidate of candidates) {
      const rel = relative(repoRoot, candidate).split("\\").join("/");
      const entry = bySrc.get(rel);
      if (entry) return `](/docs/${entry.route}${anchor}${rest})`;
    }
    warnings.push(`[链接未重写] ${srcRel}: "${href}"`);
    return full;
  });
}

function injectFrontmatter(md, entry) {
  let body = md;
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end >= 0) {
      warnings.push(`[已有 frontmatter 已剥离] ${entry.src}`);
      body = body.slice(end + 4);
    }
  }
  const frontmatter = [
    "---",
    `title: ${entry.title}`,
    `description: ${entry.description}`,
    "---",
    "",
  ].join("\n");
  return frontmatter + body.trimStart();
}

const bySrc = new Map(DOCS_MAP.map((entry) => [entry.src, entry]));

function main() {
  rmSync(contentDir, { recursive: true, force: true });
  mkdirSync(contentDir, { recursive: true });

  let synced = 0;
  for (const entry of DOCS_MAP) {
    const srcPath = join(repoRoot, entry.src);
    if (!existsSync(srcPath)) {
      warnings.push(`[源文件缺失] ${entry.src}`);
      continue;
    }
    let md = readFileSync(srcPath, "utf8");
    md = stripHtmlComments(md);
    md = escapeMdxText(md);
    md = rewriteLinks(md, entry.src);
    md = injectFrontmatter(md, entry);
    const outPath = join(contentDir, `${entry.route}.mdx`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, md, "utf8");
    synced += 1;
  }

  for (const [dir, meta] of Object.entries(META)) {
    const metaPath = join(contentDir, dir, "meta.json");
    mkdirSync(dirname(metaPath), { recursive: true });
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  }

  writeFileSync(join(contentDir, "index.mdx"), INDEX_MDX, "utf8");

  console.log(
    `[sync-docs] 同步 ${synced}/${DOCS_MAP.length} 篇，生成 ${Object.keys(META).length} 个 meta.json + index.mdx`,
  );
  if (warnings.length > 0) {
    console.warn(`[sync-docs] ${warnings.length} 条警告:`);
    for (const warning of warnings) console.warn(`  ${warning}`);
  }
}

main();
