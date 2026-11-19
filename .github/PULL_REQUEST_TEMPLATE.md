## 变更说明

<!-- 一句话说明「为什么改」，以及改前改后的行为差异 -->

Closes #

## 涉及端

- [ ] React (`apps/react`)
- [ ] Vue (`apps/vue`)
- [ ] Next.js (`apps/next`)
- [ ] Nuxt (`apps/nuxt`)
- [ ] NestJS (`apps/nest`)
- [ ] 文档站 / 官网 (`apps/website`)
- [ ] 仅仓库级（`docs/` / `scripts/` / `.github/`）

## 一致性与真源检查

- [ ] 若改动 Schema / OpenAPI 契约：已先更新 `apps/nest/openapi/openapi.yaml` 与 `apps/nest/docs/database-design.md`，并评估五端影响
- [ ] 若改动 UI 或交互：只改当前端，其余端的待同步项已登记到 `docs/progress.md`
- [ ] 若功能状态变化：已同步 `docs/feature-matrix.md`
- [ ] 若产生新的技术结论 / 机制性行为：已记入 `docs/mechanisms.md`
- [ ] 若文档口径变化：需要回写的文档站 MDX 已处理（`apps/website/content/**` 不自动同步 `docs/`）

## 验证结果

<!-- 填实际跑过的命令与结果；未跑的项请写明原因 -->

```bash
# 示例
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- 受影响端 lint：0 error
- 类型检查：0 error
- 测试：
- 构建：

## 截图 / 录屏

<!-- UI 变更必填；无视觉变化可删除本节 -->
