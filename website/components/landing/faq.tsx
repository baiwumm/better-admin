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
      "是。全部版本共用同一个 Supabase 托管的 PostgreSQL 数据库，ORM 统一为 Drizzle，Schema、数据模型、业务规则、数据类型与 API Contract 五项跨栈保持一致。",
  },
  {
    value: "ui-consistency",
    title: "不同技术栈的 UI 如何保持一致？",
    content:
      "React 版本是项目的 UI Source of Truth：页面结构、组件行为、交互与 Design Tokens 均以它为基准，其余技术栈按基准复刻；功能对齐优先于像素级对齐。",
  },
  {
    value: "api-contract",
    title: "API 契约在哪里定义？",
    content:
      "OpenAPI 是 API Contract 的唯一事实来源（nest/openapi/openapi.yaml），先定义 Contract 再实现。React / Vue 走 NestJS REST API，Next.js / Nuxt 各自实现同等契约的 Server API。",
  },
  {
    value: "auth-rbac",
    title: "认证与权限是怎么实现的？",
    content:
      "认证由应用自身实现（JWT 会话），不依赖 Supabase Auth；权限模型为 RBAC（用户 ↔ 角色 ↔ 权限位掩码），并支持菜单与权限关联控制，服务端强制校验 API 权限。",
  },
  {
    value: "open-source",
    title: "免费开源吗？代码在哪里？",
    content:
      "是，代码开源于 GitHub（baiwumm/better-admin），可以自由学习、参考与贡献，欢迎提交 Issue 与 Pull Request。",
  },
  {
    value: "docs-sync",
    title: "文档站的内容和仓库同步吗？",
    content:
      "同步。文档站构建时从仓库 docs/ 目录自动生成（docs/ 是唯一真源，含 frontmatter 注入与站内链接重写），仓库文档更新后网站内容随之更新，不存在手工维护的第二份副本。",
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
          className="-space-y-px w-full rounded-lg border border-dashed border-black/10 bg-card/50 dark:border-white/10"
        >
          {QUESTIONS.map((item) => (
            <Accordion
              key={item.value}
              value={item.value}
              title={item.title}
              className="relative border-x border-dashed border-black/20 first:rounded-t-lg first:border-t last:rounded-b-lg last:border-b dark:border-white/10"
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
