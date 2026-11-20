import type { StackKey } from "@/components/icons/stack-icons";

import { repository } from "../package.json";

/**
 * 仓库标识真源：本端 package.json 的 `repository.url`（与四端 `lib/env.ts` 同一
 * 机制、六端同值）。换仓库归属只改 package.json，文档站的 GitHub 链接随之联动。
 */
function parseGitHubRepo(url: string): { owner: string; name: string } {
  const matched = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);

  if (!matched) {
    throw new Error(`package.json repository.url 解析失败：${url}`);
  }

  return { owner: matched[1], name: matched[2] };
}

const repo = parseGitHubRepo(repository.url);

/** 站点根地址：换域名时用 NEXT_PUBLIC_SITE_URL 覆盖，末尾斜杠会被去掉 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://better-admin.baiwumm.com"
).replace(/\/+$/, "");

export const SITE = {
  name: "Better Admin",
  title: "Better Admin — 五种技术栈的 Admin 系统",
  description:
    "同一套产品、同一套 UI、业务逻辑与数据库，分别用 React、Vue、Next.js、Nuxt 与 NestJS 实现；Better Admin 官方文档。",
  url: SITE_URL,
  github: `https://github.com/${repo.owner}/${repo.name}`,
  /** 作者 GitHub 主页（页脚「Built by」指向个人主页，不是仓库） */
  ownerUrl: `https://github.com/${repo.owner}`,
  /** 作者 GitHub 用户名（页脚署名） */
  owner: repo.owner,
  /** `owner/repo` 形式的仓库全名（FAQ 等文案用） */
  repoFullName: `${repo.owner}/${repo.name}`,
} as const;

/** 全站统一 OG 图：静态 PNG，避免静态托管把无扩展名文件识别成 octet-stream */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Better Admin — 一套 Admin 系统，五种技术栈实现",
} as const;

/**
 * 备案信息：未设置环境变量时用作者默认值；显式设为空字符串（如 NEXT_PUBLIC_ICP=""）
 * 则隐藏对应条目。静态导出为构建期注入，改值后需重新构建。
 */
export const BEIAN = {
  icp: process.env.NEXT_PUBLIC_ICP ?? "粤ICP备2023007649号-2",
  police: process.env.NEXT_PUBLIC_POLICE ?? "粤公网安备44030402006402号",
} as const;

/** 四个前端演示站（线上即演示环境，DEMO_MODE=true 只读演示模式），文档站侧栏图标用 */
export const DEMOS: { name: string; url: string; icon: StackKey }[] = [
  { name: "React", url: "https://react.baiwumm.com", icon: "react" },
  { name: "Vue", url: "https://vue.baiwumm.com", icon: "vue" },
  { name: "Next.js", url: "https://next.baiwumm.com", icon: "nextjs" },
  { name: "Nuxt", url: "https://nuxt.baiwumm.com", icon: "nuxt" },
];
