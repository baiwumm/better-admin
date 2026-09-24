import { repository } from "../../package.json";

/**
 * 仓库标识真源：本端 package.json 的 `repository.url`（六端同值）。
 * owner 与仓库名由这一处解析，GitHub 链接不再往源码里散字面量。
 * ⚠️ 不可改用 `pkg.name` 推导：各应用包名带端后缀（better-admin-next 等），
 * 与仓库名 better-admin 并不相同。
 */
function parseGitHubRepo(url: string): { owner: string; name: string } {
  const matched = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);

  if (!matched) {
    throw new Error(`package.json repository.url 解析失败：${url}`);
  }

  return { owner: matched[1], name: matched[2] };
}

const repo = parseGitHubRepo(repository.url);

/**
 * 应用级环境变量访问（Next.js）。
 * 公开变量必须以 NEXT_PUBLIC_ 前缀声明（见 next/.env.example）；
 * 数据库等敏感变量仅存在于服务端，绝不在此暴露。
 */
export const ENV = {
  /** 站点名称（品牌名），如 "Better Admin" */
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Better Admin",
  appDesc:
    process.env.NEXT_PUBLIC_APP_DESC ??
    "一个探索多技术栈全栈开发的 Admin 项目。",
  /** 项目仓库 GitHub 地址 */
  repoUrl: `https://github.com/${repo.owner}/${repo.name}`,
  /** 作者 GitHub 主页 */
  ownerUrl: `https://github.com/${repo.owner}`,
  /** 作者 GitHub 用户名（登录页版权署名） */
  ownerName: repo.owner,
  /** 官方文档站（website 应用） */
  docsUrl:
    process.env.NEXT_PUBLIC_DOCS_URL ?? "https://better-admin.baiwumm.com",
  /** 作者博客 */
  blogUrl: process.env.NEXT_PUBLIC_BLOG_URL ?? "https://www.baiwumm.com",
} as const;

/** 作者名下指定仓库的 GitHub 地址（playground 元信息与演示仓库榜共用）。 */
export function githubUrl(slug: string): string {
  return `https://github.com/${repo.owner}/${slug}`;
}
