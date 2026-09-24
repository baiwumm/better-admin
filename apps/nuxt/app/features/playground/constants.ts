import pkg from '../../../package.json'

import { ENV } from '@/lib/env'

/** 仓库地址与分支：`PlaygroundIntro` 的源码链接由 `meta.source` 相对路径拼接。 */
export const REPO_URL = ENV.repoUrl
export const REPO_BRANCH = 'main'

/** 仓库内文件的 GitHub 浏览链接。 */
export function sourceUrl(path: string): string {
  return `${REPO_URL}/blob/${REPO_BRANCH}/${path.replace(/^\/+/, '')}`
}

/** npm 包页地址（由包名推导）。 */
export function npmUrl(name: string): string {
  return `https://www.npmjs.com/package/${name}`
}

type DependencyName = keyof typeof pkg.dependencies

/**
 * 从本端 package.json 读取依赖版本（去掉 ^ / ~ 前缀）。
 * 参数类型收敛为 dependencies 的键：登记未安装的包在编译期即报错，杜绝版本手写漂移。
 */
export function packageVersion(name: DependencyName): string {
  return pkg.dependencies[name].replace(/^[\^~]/, '')
}
