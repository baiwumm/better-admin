/**
 * 应用级环境变量访问（Vite）。
 * 公开变量必须以 VITE_ 前缀声明（见 react/.env / .env.example）。
 */
export const ENV = {
  /** 站点名称（品牌名），如 "Better Admin" */
  appName: import.meta.env.VITE_APP_NAME ?? "Better Admin",
  appDesc:
    import.meta.env.VITE_APP_DESC ?? "一个探索多技术栈全栈开发的 Admin 项目。",
} as const;
