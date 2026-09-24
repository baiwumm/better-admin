import { repository } from '../../package.json'

/**
 * 仓库标识真源：本端 package.json 的 `repository.url`（六端同值）。
 * owner 与仓库名由这一处解析，GitHub 链接不再往源码里散字面量。
 * 编译期常量，不经 runtimeConfig（换仓库只需改 package.json 并重新构建）。
 * ⚠️ 不可改用 `pkg.name` 推导：各应用包名带端后缀（better-admin-nuxt 等），
 * 与仓库名 better-admin 并不相同。
 */
function parseGitHubRepo(url: string): { owner: string, name: string } {
  const matched = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url)

  if (!matched) {
    throw new Error(`package.json repository.url 解析失败：${url}`)
  }

  return { owner: matched[1], name: matched[2] }
}

const repo = parseGitHubRepo(repository.url)

interface EnvConfig {
  /** 站点名称（品牌名），如 "Better Admin" */
  appName: string
  appDesc: string
  /** 后端 API Base URL（含全局前缀 /api）；Nuxt 端为同源 Nitro server routes */
  apiBaseUrl: string
  /** 项目仓库 GitHub 地址 */
  repoUrl: string
  /** 作者 GitHub 主页 */
  ownerUrl: string
  /** 作者 GitHub 用户名（登录页版权署名） */
  ownerName: string
  /** 官方文档站（website 应用） */
  docsUrl: string
  /** 作者博客 */
  blogUrl: string
}

const config: EnvConfig = {
  appName: 'Better Admin',
  appDesc: '一个探索多技术栈全栈开发的 Admin 项目。',
  apiBaseUrl: '/api',
  repoUrl: `https://github.com/${repo.owner}/${repo.name}`,
  ownerUrl: `https://github.com/${repo.owner}`,
  ownerName: repo.owner,
  docsUrl: 'https://better-admin.baiwumm.com',
  blogUrl: 'https://www.baiwumm.com'
}

/** plugin 启动时注入 runtimeConfig.public（覆盖默认值）。 */
export function initEnv(publicConfig: Partial<EnvConfig>) {
  Object.assign(config, publicConfig)
}

export const ENV = config

/** 作者名下指定仓库的 GitHub 地址（playground 元信息与演示仓库榜共用）。 */
export function githubUrl(slug: string): string {
  return `https://github.com/${repo.owner}/${slug}`
}
