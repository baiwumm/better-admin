import Link from "next/link";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { SITE } from "@/lib/site";

const QUESTIONS = [
  {
    value: "what-is",
    title: "Better Admin 是什么？",
    content:
      "一套使用 React、Vue、Next.js、Nuxt 与 NestJS 分别实现的全栈 Admin 系统——同一套产品、同一套 UI、同一套业务逻辑、同一套数据库，各技术栈独立实现、独立部署。",
  },
  {
    value: "why-multi-stack",
    title: "为什么要用多种技术栈重复实现同一套系统？",
    content:
      "目的是验证同一套产品在不同技术栈下的完整落地路径，沉淀可对照参考的实现范例。各应用独立运行、独立构建、独立部署，不因多实现而产生技术栈耦合。",
  },
  {
    value: "shared-database",
    title: "五个版本共用数据库吗？",
    content:
      "是。全部版本共用同一个 Supabase 托管的 PostgreSQL 数据库，ORM 统一为 Drizzle，Schema、数据模型、业务规则、数据类型与 API Contract 五项跨栈保持一致。迁移只在 NestJS 端发起。",
  },
  {
    value: "ui-consistency",
    title: "不同技术栈的 UI 如何保持一致？",
    content:
      "React 版本是项目的 UI Source of Truth：页面结构、组件行为、交互与 Design Tokens 均以它为基准，其余技术栈按基准复刻。React 与 Next.js 用 Hero UI，Vue 与 Nuxt 用 Nuxt UI v4，组件库不同但视觉与交互对齐；功能对齐优先于像素级对齐。",
  },
  {
    value: "api-contract",
    title: "API 契约在哪里定义？",
    content:
      "OpenAPI 是 API Contract 的唯一事实来源（apps/nest/openapi/openapi.yaml），先定义 Contract 再实现。React / Vue 走 NestJS REST API，Next.js / Nuxt 各自实现同等契约的 Server API。改契约前必须逐端评估影响面。",
  },
  {
    value: "auth-rbac",
    title: "认证与权限是怎么实现的？",
    content:
      "认证由应用自身实现（JWT 双 Token 会话），不依赖 Supabase Auth；权限模型为 RBAC（用户 ↔ 角色 ↔ 权限位掩码），10 个权限点各占一个二进制位。服务端通过权限守卫强制校验 API 权限，前端路由守卫只是体验层。",
  },
  {
    value: "function-parity",
    title: "四个前端的功能对齐到什么程度了？",
    content:
      "共 27 项功能，四个前端目前均为 26 / 27，完成度 96%。唯一未对齐的是 Dashboard 概览，四端与 NestJS 都还没实现，已列入后续排期。",
  },
  {
    value: "open-source",
    title: "免费开源吗？代码在哪里？",
    content:
      "是，代码开源于 GitHub（baiwumm/better-admin），可以自由学习、参考与贡献，欢迎提交 Issue 与 Pull Request。",
  },
  {
    value: "docs-source",
    title: "这个文档站的内容来自哪里？",
    content:
      "本站的文档是为读者单独整理、精编的，不是仓库文档的整篇搬运——每页只留重点、配图与核心代码。仓库里的 docs/ 面向开发者与 AI Agent，规则更细、篇幅更长；两处各自维护，不互相同步。",
  },
];

export function Faq() {
  return (
    <section className="border-b border-dashed border-black/10 dark:border-white/10">
      <div className="mx-auto w-full max-w-3xl space-y-7 px-6 py-16 md:py-24">
        <div className="space-y-2 text-center">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
            关于 Better Admin 的常见问题。如果没有找到想要的答案，欢迎在 GitHub
            提出你的问题。
          </p>
        </div>
        <Accordions
          type="single"
          collapsible
          className="-space-y-px w-full rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-20px_rgb(0_0_0/0.22)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_12px_32px_-20px_rgb(0_0_0/0.8)]"
        >
          {QUESTIONS.map((item) => (
            <Accordion
              key={item.value}
              value={item.value}
              title={item.title}
              className="relative border-b border-dashed border-black/10 last:border-b-0 dark:border-white/10"
            >
              {item.content}
            </Accordion>
          ))}
        </Accordions>
        <p className="text-center text-muted-foreground">
          没有找到想问的？欢迎在{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>{" "}
          提出 Issue。
        </p>
      </div>
    </section>
  );
}
