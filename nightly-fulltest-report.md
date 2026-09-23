# 上线前夜全量测试报告

> 执行时间：2026-09-23 01:01 – 01:13（定时任务，无人值守）
> 基线：`5ef81025dc3cf4c42d0b531e58a425d30d8f345f`（工作区 clean）
> 执行环境：本机（Windows / Git Bash / Volta，nuxt 端 pnpm 12.3.4、其余 pnpm 11，与 CI 矩阵同口径）
> 本报告不提交入库；看完可删，或由用户决定归档。

---

## ✅ 最终判定：可上线

六端静态检查 17/17 绿 + 三端 check-locales 绿 + 契约冒烟 31 步一致 + 工作区零残留改动。机器可验证的上线门槛全部通过。

---

## 一、结果矩阵

| 端 | lint | 类型检查 | test | build | check-locales |
| --- | --- | --- | --- | --- | --- |
| react | ✅ ~27s | build 内含 tsc | ✅ 8 文件 93 用例，~9s | ✅ ~20s | ✅ 14 文件一致 |
| vue | ✅ ~20s | ✅ vue-tsc ~18s | ✅ 10 文件 101 用例，~11s | ✅ ~22s | （pre 钩子自动 sync） |
| next | ✅ ~23s | build 内含 | ⏭️ 无 test 脚本（台账 #46，既定口径） | ✅ ~24s | ✅ 14 文件一致 |
| nuxt | ✅ ~20s | ✅ ~21s | ✅ 10 文件 99 用例，~8s | ✅ ~35s | ✅ 14 文件一致 |
| nest | ✅ ~9s | — | ⏭️ 无 test 脚本（#46） | ✅ ~7s | — |
| website | — | — | — | ✅ 静态生成正常 | — |

六端 build 全绿；与今日已合入的 CI 矩阵（`.github/workflows/ci.yml` 17 步）完全同口径。

### 不阻塞的既有 warning（与历史基线一致，非新增）

- react：0 error / 6 warning（`no-console`）；vue：0 error / 7 warning；next：0 error / 24 warning——全部为既有 `no-console`。
- vue build 的 chunk >500kB 提示、pnpm 11 对 `pnpm.onlyBuiltDependencies` 字段的 WARN：均既有。

## 二、契约冒烟（Nest :3010 ↔ Nuxt :3001，本机）

- 就绪：`GET :3010/api/health` → 200（JSON 信封）；`GET :3001/` → 200。
- 执行：`node scripts/contract-diff.mjs http://localhost:3001/api http://localhost:3010/api`（凭据经 `CONTRACT_PASSWORD` 从 `apps/nest/.env` 注入，全程未回显、未落报告）。
- 结果：**退出码 0，31 步全部一致**——30 步 `[OK]` + 1 步 `[KNOWN]`：
  - `GET /permissions` 的 `body.data[9].label`：nuxt=`export` / nest=`导出`——脚本内已登记的既有差异（Nest vs Next 蓝本，Nuxt 对齐 Next，前端 i18n），非缺陷。
- 覆盖：openapi v1.14.0 全部只读 GET（含 `/stats/overview`、`/roles/{id}/users`、`/logs/{id}` 等）；写操作按设计不 diff（避免共库脏数据）。
- 进程收尾：3010 / 3001 已按 PID 终止，残留监听 0。

> 过程备注：第一次执行因 shell 后台化把 `cd` 一起带入子进程导致脚本路径错误（服务未受影响），修正后重跑成功，以上为重跑结果。

## 三、工作区防护（lint --fix / sync-locales）

测试全程结束后 `git status --porcelain` 为 **0 行改动**（基线 0 行）——react / vue / next 的 `lint --fix` 与 nuxt / vue 的 sync-locales 钩子均未产生任何文件变更，无需还原，无残留。

## 四、未覆盖项（如实声明，不作为红灯）

1. **next / nest / website 无自动化测试**——台账 #46 待拍板项，本轮按既定口径不为此引入测试框架。
2. **GUI 走查类**（机器不可判，由用户自行验收）：okr-tree 三端走查、v1.13 角色关联用户三端走查、Next / Vue Dashboard 像素观感——见 `docs/launch-audit.md` 32–39。
3. **写操作契约一致性**：冒烟设计为只读 GET，写路径靠逐行平移保证（共库不产生脏数据）。
4. **线上环境**：本报告全部为本地验证；每端部署后的线上冒烟清单见 `docs/launch-runbook.md`，收官项为四端上线后对线上地址全量跑一次 contract-diff。

## 五、早上优先看

1. 本报告「最终判定」：✅ 可上线。
2. `docs/launch-runbook.md`：按「全局节」的上线的顺序（Nest → 保活 → React/Vue → Next/Nuxt → website → 收官冒烟）开始执行，每完成一端把冒烟结果记入对应勾选表。
3. 演示模式已按 2026-09-22 拍板写入 runbook：Nest / Next / Nuxt 三端 `DEMO_MODE=true`（Nest 另开 `LOG_API_SKIP_GET=true`）。
4. 两份交付物（本报告 + runbook）均未提交，是否入库由你决定。
