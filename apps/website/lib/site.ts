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

export const SITE = {
  name: "Better Admin",
  title: "Better Admin — 一套 Admin 系统，五种技术栈实现",
  description:
    "同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用 React、Vue、Next.js、Nuxt 与 NestJS 实现。Better Admin 官方开发文档。",
  url: "https://better-admin.baiwumm.com",
  github: `https://github.com/${repo.owner}/${repo.name}`,
  /** 作者 GitHub 主页（页脚「Built by」指向个人主页，不是仓库） */
  ownerUrl: `https://github.com/${repo.owner}`,
  /** 作者 GitHub 用户名（页脚署名） */
  owner: repo.owner,
  /** `owner/repo` 形式的仓库全名（FAQ 等文案用） */
  repoFullName: `${repo.owner}/${repo.name}`,
} as const;

/** 四个前端演示站（线上即演示环境，DEMO_MODE=true 只读演示模式），文档站侧栏图标用 */
export const DEMOS: { name: string; url: string; icon: StackKey }[] = [
  { name: "React", url: "https://react.baiwumm.com", icon: "react" },
  { name: "Vue", url: "https://vue.baiwumm.com", icon: "vue" },
  { name: "Next.js", url: "https://next.baiwumm.com", icon: "nextjs" },
  { name: "Nuxt", url: "https://nuxt.baiwumm.com", icon: "nuxt" },
];
