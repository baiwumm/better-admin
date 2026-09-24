import { repository } from "../../package.json";

/**
 * 仓库标识真源：本端 package.json 的 `repository.url`（六端同值）。
 * owner 与仓库名由这一处解析，GitHub 链接不再往源码里散字面量。
 * ⚠️ 不可改用 `pkg.name` 推导：各应用包名带端后缀（better-admin-vue 等），
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
 * 应用级环境变量访问（Vite）。
 * 公开变量必须以 VITE_ 前缀声明（见 vue/.env.example）。
 */
export const ENV = {
  /** 站点名称（品牌名），如 "Better Admin" */
  appName: import.meta.env.VITE_APP_NAME ?? "Better Admin",
  appDesc:
    import.meta.env.VITE_APP_DESC ?? "一个探索多技术栈全栈开发的 Admin 项目。",
  /** 后端 API Base URL（含全局前缀 /api），如 http://localhost:3000/api */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api",
  /** 项目仓库 GitHub 地址 */
  repoUrl: `https://github.com/${repo.owner}/${repo.name}`,
  /** 作者 GitHub 主页 */
  ownerUrl: `https://github.com/${repo.owner}`,
  /** 作者 GitHub 用户名（登录页版权署名） */
  ownerName: repo.owner,
  /** 官方文档站（website 应用） */
  docsUrl: import.meta.env.VITE_DOCS_URL ?? "https://better-admin.baiwumm.com",
  /** 作者博客 */
  blogUrl: import.meta.env.VITE_BLOG_URL ?? "https://www.baiwumm.com",
} as const;

/** 作者名下指定仓库的 GitHub 地址（playground 元信息与演示仓库榜共用）。 */
export function githubUrl(slug: string): string {
  return `https://github.com/${repo.owner}/${slug}`;
}
