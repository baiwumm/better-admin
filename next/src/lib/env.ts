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
} as const;
