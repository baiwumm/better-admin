import type { StackKey } from "@/components/icons/stack-icons";

export const SITE = {
  name: "Better Admin",
  title: "Better Admin — 一套 Admin 系统，五种技术栈实现",
  description:
    "同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，分别用 React、Vue、Next.js、Nuxt 与 NestJS 实现。Better Admin 官方开发文档。",
  url: "https://better-admin.baiwumm.com",
  github: "https://github.com/baiwumm/better-admin",
} as const;

/** 四个前端演示站（线上即演示环境，DEMO_MODE=true 只读演示模式），文档站侧栏图标用 */
export const DEMOS: { name: string; url: string; icon: StackKey }[] = [
  { name: "React", url: "https://react.baiwumm.com", icon: "react" },
  { name: "Vue", url: "https://vue.baiwumm.com", icon: "vue" },
  { name: "Next.js", url: "https://next.baiwumm.com", icon: "nextjs" },
  { name: "Nuxt", url: "https://nuxt.baiwumm.com", icon: "nuxt" },
];
