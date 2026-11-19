# Contributing · 参与贡献

感谢你愿意为 Better Admin 出力。本文只做**指路**——具体规则一律以真源文档为准，这里不复述、也不维护第二份副本。

## 先了解这个仓库

同一个后台系统由 **React / Vue / Next.js / Nuxt / NestJS** 五套技术栈独立实现，共用同一个 PostgreSQL 数据库与同一份 OpenAPI 契约。改动前请先读：

- 项目定位与架构：[`docs/requirements.md`](docs/requirements.md)
- 开发硬性规则（含提交规范、五端一致性、UI 基准）：[`AGENTS.md`](AGENTS.md)
- 四端功能对齐现状：[`docs/feature-matrix.md`](docs/feature-matrix.md)
- 完整文档站：<https://better-admin.baiwumm.com>

## 环境准备

各 `apps/*` 都是**独立应用**（不共享 workspace、各有自己的 lockfile 与依赖），单独安装、单独启动：

```bash
cd apps/react   # 或 vue / next / nuxt / nest
pnpm install
pnpm dev
```

可用的脚本（dev / build / lint / test / typecheck 等）以各端 `package.json` 为准；逐端的启动步骤见[快速开始](https://better-admin.baiwumm.com/docs/start/quick-start/)。

## 可以贡献什么

- 缺陷修复：先看 Issues 是否已有记录
- 文档与文案：`docs/` 与文档站 `apps/website/content/**`
- 国际化语言包、可访问性、性能优化
- 新的想法：先发 [Discussions · Ideas](https://github.com/baiwumm/better-admin/discussions/categories/ideas)，方向对齐后再动手

不确定要不要开 Issue？使用类问题请走 [Q&A](https://github.com/baiwumm/better-admin/discussions/categories/q-a)，可复现的缺陷走 [Bug 模板](https://github.com/baiwumm/better-admin/issues/new/choose)。

## 提 PR 的流程

1. Fork 或新建分支，不要在 `main` 上直接开发（`main` 已启用规则集：禁删除、禁 force push、必须走 PR 且通过 `gate` 检查）。
2. 提交信息按 [`AGENTS.md`](AGENTS.md) §10 的 Conventional Commits 规范书写；AI 参与编写的提交需带上对应 trailer（同一节有校验方式）。
3. 按 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md) 填写：涉及哪些端、是否动了 Schema / 契约、`feature-matrix` 是否需同步、跑了哪些验证命令。
4. 合并方式为 **squash**，一个 PR 只做一件事。

## 跨端改动的注意事项

- 改数据库 Schema 或 API 契约：先改契约真源，再改实现（顺序见 [`AGENTS.md`](AGENTS.md) §6）。
- 只改一个端时：其余端的待同步项请登记到 [`docs/progress.md`](docs/progress.md)，不要各端自行发明 UI 方案。
- `docs/` 的任何口径变化都需要人工回写文档站（`apps/website/content/**` 不是自动同步）。

## 行为与安全

- 参与讨论与提交代码即表示同意遵守[行为准则](CODE_OF_CONDUCT.md)。
- 发现安全漏洞请**不要**开公开 Issue，按 [`SECURITY.md`](SECURITY.md) 的私密渠道报告。
