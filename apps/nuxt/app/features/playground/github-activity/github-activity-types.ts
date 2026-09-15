/** GitHub 贡献热力图的数据类型（对齐 React 端 vendor 组件的导出类型）。 */

export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export type Contribution = {
  date: string
  count: number
  level: ContributionLevel
}

export type RepoContribution = {
  name: string
  count: number
  /** 仓库 logo 图片地址；缺省显示名称首字母 */
  logo?: string
  href?: string
}

export type FormatDay = (day: Contribution) => string
export type FormatHeading = (total: number, year: number | null) => string
export type ToggleLabels = { show: string, hide: string }
