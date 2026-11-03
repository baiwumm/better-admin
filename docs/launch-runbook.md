# Better Admin 上线操作手册

> **上线执行日：2026-09-23**。待办与取证见 [`docs/launch-audit.md`](./launch-audit.md)；上线前夜全量测试结论（✅ 可上线）原记于仓库根 `nightly-fulltest-report.md`（一次性时点报告，2026-09-24 已删除，git 历史 `30e783e` 可查；六端检查结论已由 CI 17 步矩阵与本文件 §7 收官表承接）。
> **用户已拍板（2026-09-22）：线上即演示环境**——Nest / Next / Nuxt 三端 `DEMO_MODE=true`。
> **✅ 2026-09-23 收官**：六端全部完成部署与上线冒烟（HTTP 层 + 用户浏览器 GUI 走查），收官线上 contract-diff 31 步一致（见 §7 总勾选表）。
> **使用方式**：按「全局节」顺序逐端部署，每完成一端的部署与冒烟，把结果记入该端的冒烟勾选表。

---

## 0 · 全局节

### 0.1 上线顺序（必须遵守）

```text
① Nest（Render）→ ② Nest 外部保活 → ③ React / Vue（Vercel）→ ④ Next / Nuxt（Vercel）→ ⑤ website（CF Workers 静态导出，2026-09-23 当日由 Vercel 改判）→ ⑥ 收官线上契约冒烟
```

Nest 必须最先：React / Vue 的 API 直接指向它；保活必须紧随其后（Render 免费层 15 分钟不活跃即休眠，且 Nest 进程内的日志 / refresh_token 清理 cron 依赖常驻才执行）。

### 0.2 数据库与密钥总则

- 除 website 外的五端共用**同一个 Supabase PostgreSQL**：dev 与线上本就是同一个库，任何环境都不存在「独立测试库」，线上冒烟因此只做只读 + 登录验证。
- `DATABASE_URL` 一律使用 **6543 transaction pooler** 端口（本地 dev 用 5432 session pooler 的差异不要带上线）；**URL 中禁止携带 `sslmode` 参数**——SSL 由代码层配置，URL 带了会因证书链校验连库失败。
- JWT 密钥：`JWT_SECRET` 必填强随机值（Nest 缺失或纯空白**启动即抛错**，无明文兜底）；`JWT_REFRESH_SECRET` 建议独立设置，留空回退 `JWT_SECRET`。
- Supabase Storage 密钥使用**新 API key 体系**：`SUPABASE_SECRET_KEY` 取 `sb_secret_` 前缀的 Secret key（走 `apikey` 请求头）；旧 service_role JWT key 2026 年底废弃，不要再用。
- `SEED_ADMIN_PASSWORD` **仅对全新库首次 seed 生效**：共库已有 admin，重跑 seed 走 `onConflictDoNothing` 不会覆盖现有密码——线上配置可不管此变量。
- 环境变量只在各平台后台配置；**任何真实密钥不进仓库、不进文档、不进聊天记录**。

### 0.3 Vercel 防火墙限流规则（2026-10-14 新增，Next / Nuxt 两项目各自配置）

背景：Next / Nuxt 的 `/api/auth/*` 三个公开入口（`login` / `demo-login` / `refresh`）应用层无限流，且线上 `DEMO_MODE=true` 时 `demo-login` 可免密铸造会话；六端共用同一个 Supabase 库，接口被刷会先拖垮 6543 pooler 连接。故在 **Vercel WAF** 平台层配限流——零代码改动，且被 429 的请求不产生函数调用。

**规则内容**（Dashboard → 项目 → Firewall → Configure → 新建 Rate Limit 规则「Auth API 限流 · IP 防刷」，`next` 与 `nuxt` 两个项目**各配一份**）：

| 项 | 值 |
| --- | --- |
| If | Request Path **starts with** `/api/auth/` |
| Rate Limit | Fixed Window，**60 seconds / 20 requests**，Key = **IP Address** |
| Then | **Too Many Requests (429)** |

**为什么配平台层而非代码层**：`vercel.json` 的 `routes.mitigate` 只支持 challenge / deny、不支持 rate limit；serverless 实例内存限流不可靠；DB 计数反给共库加压。Vercel WAF Rate Limiting 全套餐可用（注意 Hobby 每项目仅 1 条 rate limit 规则额度、自定义规则共 3 条；「触发后按 IP 拉黑一段时间」的持久化动作需 Pro）。

**验证（2026-10-14 实测，两端结果一致）**：25 并发失败登录（用不存在的用户名，无副作用、不写日志）→ 前 20 个 `401`（放行到应用）+ 第 21 个起 `429`，分界正好落在 20 次；等待窗口过后单发恢复 `401`。⚠️ Fixed Window 语义：触发后整个 60 秒窗口内继续 `429` 属预期，不是故障。

**注意事项**：

- 规则只存在于 Vercel Dashboard（按项目隔离），**不随仓库走**——重建项目 / 换团队必须按本节重配并复测。
- 计数器**按 region 维度**统计，多 region 流量可能超出单 region 限额——护栏而非硬保证。
- IP 维度在共享 NAT（办公室 / 运营商 CGNAT）下可能误伤，20 次/分对真人足够宽松，勿盲目调低。
- Nest（Render）不在 Vercel 规则覆盖内；React / Vue 的 API 走 Nest，如需同等防刷需另行评估（暂未做）。

---

## 1 · Nest（Render）— 第一个部署

| 项 | 值 |
| --- | --- |
| 平台 | Render（免费 Web Service） |
| 域名 | `https://nest.baiwumm.com` |
| Root Directory | `apps/nest` |
| Build Command | `pnpm install && pnpm build`（或按 Render 默认补 install） |
| Start Command | `node dist/main.js` |
| 端口 | Render 自动注入 `PORT`，**无需配置**（`main.ts` 读 `process.env.PORT ?? 3000`） |
| Health Check Path | `/api/health`（Render 侧填这个路径；⚠️ 必须带 `/api` 全局前缀，不是 `/health`） |

### 1.1 环境变量表

| 变量 | 必填 | 取值说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Supabase **6543** transaction pooler 连接串；禁止带 `sslmode` |
| `JWT_SECRET` | ✅ | 强随机串；缺失/纯空白启动即抛错 |
| `JWT_REFRESH_SECRET` | 建议 | 独立强随机串；留空回退 `JWT_SECRET`（空串视为未设置） |
| `JWT_EXPIRES_IN` | 可省 | 默认 `1h` |
| `REFRESH_EXPIRES_IN` / `REFRESH_EXPIRES_IN_SHORT` | 可省 | 默认 `30d` / `1d`（记住我 / 短会话） |
| `CORS_ORIGINS` | ✅ | `https://react.baiwumm.com,https://vue.baiwumm.com`——**只列 React / Vue 两域**（Next / Nuxt 独立全栈不调本服务）；不设则用 main.ts 内置白名单（含 localhost 五端口 + 两生产域） |
| `DEMO_MODE` | ✅ | `true`（2026-09-22 拍板：线上即演示环境；开启后非白名单写请求一律 403 `DEMO_READONLY`，并开放 `POST /api/auth/demo-login` 快捷登录） |
| `LOG_API_SKIP_GET` | ✅ | `true`（演示环境 GET 不落 api 日志降噪；非 GET 照记） |
| `THROTTLE_ENABLED` | 可省 | 默认 `true`（契约 v1.14.1：auth 三口限流开关，login/demo-login 20 次/60s per IP、refresh 60 次/60s，超限 429 `TOO_MANY_REQUESTS`；进程内存计数不碰库。保持默认开启即可，勿关） |
| `LOG_API_ENABLED` | 可省 | 默认 `true` |
| `LOG_CLEANUP_*` / `REFRESH_TOKEN_CLEANUP_*` | 可省 | 默认每日北京时间 03:00 / 03:30，保留 30 天 |
| `SUPABASE_URL` | ✅ | `https://<project>.supabase.co`（头像上传中转） |
| `SUPABASE_SECRET_KEY` | ✅ | `sb_secret_` 前缀 Secret key（严禁提交/外泄） |
| `SEED_ADMIN_PASSWORD` | 无需 | 已上线库不生效（见 0.2） |

### 1.2 部署步骤

1. Render 创建 Web Service，连接本仓库，Root Directory 指向 `apps/nest`，填 Build / Start Command 与 1.1 全部环境变量。
2. 部署完成后验证 `GET https://nest.baiwumm.com/api/health` 返回 200 信封。
3. **本地跑一次 `pnpm storage:init`**（幂等创建 Supabase `avatars` bucket，public read；只需一次，与 Render 部署无依赖关系）。
4. **立即配置外部保活（必做，见 0.1②）**：UptimeRobot 或 CF Worker Cron，每 5-10 分钟以 **HTTP(S) 类型**探测 `https://nest.baiwumm.com/api/health`。⚠️ **禁止选 PING（ICMP）类型**——它不发 HTTP 请求、URL 路径对它无意义，且 Render 入口不响应 ICMP，结果永远是 Down 而服务其实健康（本次上线即因此空转，见 §1.3 注记与 `docs/mechanisms.md` §39）。

> ⚠️ Render 自带的 Health Check Path **不等于保活**：它只服务于平台监控与部署失败判定，不计入外部入站流量、**不会阻止免费层 15 分钟休眠**——上一步的外部探活不能被它替代，两者都要配。

### 自定义域与 CF DNS（`nest.baiwumm.com`，zone 托管在 Cloudflare）

1. Render：Settings → Custom Domains → 添加 `nest.baiwumm.com`，记下它给的 CNAME 目标（形如 `<service>.onrender.com`）。
2. **先查旧记录**：CF DNS 里该子域若已有指向历史旧项目的 A / CNAME 记录（react / next 现域名即指向旧项目），直接**改**那条记录，不要并存两条。
3. CF DNS 添加 / 修改 CNAME：`nest` → `<service>.onrender.com`，**代理状态选「仅 DNS」（灰云）**；回 Render 完成验证，证书由 Render 自动签发。
4. **推荐灰云直连**：API 后端不需要 CDN，少一层代理 = 少 CORS / 缓存 / 代理超时 / Bot 拦截一整类故障面，外部保活探活也直达源站。
5. 若坚持开橙云（代理），四件事必须处理：① CF SSL/TLS 加密模式设 `Full`（绝不可 Flexible——Render 强制 HTTPS 会无限重定向循环）；② 加 Cache Rule 对 `/api/*` Bypass 缓存；③ CF 免费版代理超时 100s（Render 冷启动 30-50s 在限内，但保活探测端的超时要调得大于冷启动，否则误报）；④ 若 zone 开了 Bot Fight Mode / Under Attack，UptimeRobot 的 HTTP 探测会被当 bot 拦截，须加白名单或关闭。

### 1.3 上线后冒烟清单（✅ 2026-09-23 实测全绿）

- [x] 自定义域灰云直连生效：DNS 解析链 `nest.baiwumm.com → better-admin.onrender.com → gcp-us-west1-1.origin.onrender.com.cdn.cloudflare.net`——解析穿透 CNAME 到 Render 侧，未被本 zone 代理接管
- [x] `GET /api/health` 200 + 正确信封 `{"status":"ok","uptimeSeconds":711,…}`
- [x] `POST /api/auth/login` 真实 admin 账号 200（accessToken 正常签发）
- [x] `POST /api/auth/demo-login` 200——⚠️ **body 必填 `{"kind":"admin"|"random"}`**（DTO `@IsIn` 校验，空 body 会 400，这是校验拒绝不是故障）；`admin` / `random` 两档均实测 200 且 `/auth/me` 可用
- [x] CORS 预检：`react` / `vue` 两域均 204 + `Access-Control-Allow-Origin` 正确回显 + 全方法放行
- [x] 外部保活：UptimeRobot 5 分钟 PING 已配置；部署后 uptime 711s 常驻未休眠（跨过 15 分钟阈值后的最终确认随下一端冒烟复测 uptime 连续性）
- [x] 演示只读验证：带 token `POST /users` → 403 `DEMO_READONLY`（「演示环境，禁止修改数据」）——`DEMO_MODE=true` 生效
- [x] auth 限流线上复验（契约 v1.14.1，2026-10-14 已验证）：`POST /api/auth/login` 同 IP 25 连发 → 401×22 + 429×3（少量请求散落运营商第二出口的桶，主桶第 21 个起 429），429 信封 `{ code: 'TOO_MANY_REQUESTS' }`，60 秒窗口后恢复 401；带伪造 `X-Forwarded-For` 无法绕过（计数取 trust 语义解析的真实客户端 IP）；`/api/health`（UptimeRobot 探活路径）不在限流范围、全程 200。⚠️ **部署纠偏记录**：`trust proxy` 初版设 1 不生效——Render 实际链路为 client → CF for SaaS 边缘（104.22.x.x）→ Render 内部代理（10.x 私网）→ 应用，共 **3 跳**（error 日志 `detail.xff` 取证），定值 3 后生效；`req.ip` 依赖此配置，Render 链路变化时需同步调整（取证位：error 日志 `detail.clientIp / detail.xff`）。

> **指纹判据修正（实测纠偏）**：Render 平台自身挂在 Cloudflare for SaaS 后面，任何 Render 服务的响应都带 `server: cloudflare` / `cf-ray` 头——**不能**以「有无 cf 头」判断本 zone 是否开了橙云；正确判据是 DNS 解析链（见第一条）。

> **保活类型修正（2026-09-23 二次纠偏，以本条为准）**：上表第 6 项记录的「UptimeRobot 5 分钟 **PING** 已配置」经复核**实际无效**——监控类型选成了 PING（ICMP），它只探测主机、不发 HTTP 请求（填进去的 URL 路径对它毫无意义），而 `nest.baiwumm.com` 的入口（Render 挂在 Cloudflare for SaaS 后）不响应 ICMP。后果是该监控自配置起持续 Down 6h51m 且 `No response time data`，而同期 `GET /api/health` 实测 **200 / 0.76s**——即**保活从未生效过**：Render 免费层 15 分钟休眠未被挡住，进程内日志 / refresh_token 清理 cron（每日 03:00 / 03:30 北京时间）失去常驻前提。处置：新建 **HTTP(S)** 类型监控指向 `https://nest.baiwumm.com/api/health`（5 分钟间隔），旧 PING 监控删除；改后 UptimeRobot `Up / 100% / 276ms`，`uptimeSeconds` 五次采样 111→147→173→475→1168（08:22:25→08:40:02 UTC）逐秒连续、进程零重启，末次 **1168 秒已跨过 15 分钟休眠线仍在涨 ⇒ 保活实锤生效**。第 6 项原文按 §13「历史记录不回改」保留。机理、误报识别与验证口径见 `docs/mechanisms.md` §39。

### 1.4 回滚

Render Dashboard → 该服务 → **Redeploy 上一版本**（Deployments 列表选上一个成功部署）。

---

## 2 · React（Vercel，2026-11-02 自 CF Workers 迁入）

| 项 | 值 |
| --- | --- |
| 平台 | Vercel（纯静态 SPA 产物） |
| 域名 | `https://react.baiwumm.com`（baiwumm.com zone 仍在 Cloudflare DNS：CNAME 指向 Vercel + 代理设 **DNS only 灰云**，橙云会干扰 Vercel 域名验证与证书签发） |
| Root Directory | `apps/react` |
| 构建 | Vercel 识别 Vite：`pnpm build` → `dist/`；端内 `pnpm-lock.yaml` 决定用 pnpm 安装（端内 `pnpm-workspace.yaml` 仅为 pnpm 设置，非 workspace 声明） |
| 配置 | `apps/react/vercel.json`：`rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`——**SPA 深链回退的唯一来源，缺它刷新任意深链即返回 `X-Vercel-Error: NOT_FOUND`**（2026-11-02 迁移当日实测踩坑）。rewrites 在文件系统匹配之后应用，`/assets/*`、图标等真实文件不受影响。原 `wrangler.jsonc`（`not_found_handling=single-page-application`）已删除，Workers/Pages 的 `_redirects` 方案一并作废 |

### 2.1 环境变量表（⚠️ 构建期注入）

| 变量 | 必填 | 取值说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ✅ | `https://nest.baiwumm.com/api`——**构建前必须显式设置**：`.env.example` 默认 `http://localhost:3000/api`，Vite 构建期静态替换，漏设 = 线上调本地 API 全挂。做法：Vercel Project → Settings → Environment Variables 配该变量（构建期注入），或本地构建前在 shell 里 export |
| `VITE_APP_NAME` / `VITE_APP_DESC` | 可省 | 默认 Better Admin 品牌名与描述 |

### 2.2 部署步骤

1. Vercel 新建项目：导入仓库、**Root Directory = `apps/react`**，构建命令与输出目录用默认（`pnpm build` / `dist`）；SPA 回退由 `vercel.json` 提供，不需要在 Dashboard 的 Rewrites 面板另配。
2. Environment Variables 配 `VITE_API_BASE_URL=https://nest.baiwumm.com/api`（作用域 Production）。
3. 推送 `main` 触发构建；产物核验：本地 `pnpm build` 后 `grep -r "localhost:3000" dist/` 应无结果。
4. Settings → Domains 添加 `react.baiwumm.com`；按 Vercel 提示把 Cloudflare DNS 里该记录改为指向 Vercel 的 CNAME，并将代理状态设为 **DNS only（灰云）**。

### 2.3 上线后冒烟清单（✅ 2026-09-23 于 CF Workers 实测全绿，历史记录保留；迁 Vercel 后的复验见 §2.4）

- [x] 首页 `https://react.baiwumm.com` 200（text/html）
- [x] **SPA 深链回退**：`/settings/users`、`/org/depts`、`/playground/okr-tree`、`/sign-in` 直开全部 200 + HTML，不 404
- [x] 产物 API 地址核验：递归爬取线上全部 20 个 JS chunk——env chunk（`/assets/env-*.js`）确认指向 `https://nest.baiwumm.com`；`localhost:3000` 零残留（主包唯一一处 `localhost` 为第三方库非浏览器环境的 origin 兜底，与 API 无关）
- [x] 图标 / manifest：`favicon.ico` / `favicon.svg` / `favicon-96x96.png` / `apple-touch-icon.png` / `site.webmanifest` 全部 200 + 正确 MIME
- [x] 跨域实际请求：带 `Origin: https://react.baiwumm.com` 打线上 Nest，`Access-Control-Allow-Origin` 正确回显（未登录 401 为预期）
- [x] 浏览器走查 ✅（2026-09-23 用户完成）：演示快捷登录可用 / 写操作弹 DEMO_READONLY 提示 / 控制台无 CORS 报错 / 视觉走查

### 2.4 Vercel 迁移复验（2026-11-02 起，React / Vue 两端通用）

- [x] 深链直开全部 200 + HTML：`/settings/users`、`/org/depts`、`/playground/okr-tree`、`/sign-in`、`/org/notices/12`（判据 `curl -o /dev/null -w "%{http_code}"`，响应头不得出现 `X-Vercel-Error: NOT_FOUND`）——2026-11-02 `07b30b0` 部署后两端实测全 200 `text/html`，无 `X-Vercel-Error`
- [x] 页面内**刷新**后仍停在原路由（本次报障现象即「首次访问可、刷新 404」）——浏览器刷新与直开深链同为硬导航 GET，落回同一份 `index.html` 后由客户端路由解析；深链直开全绿即等价通过，GUI 手感见最后一条
- [x] 真实静态文件未被 rewrites 吃掉：`/assets/index-*.js`（200 `application/javascript`）、`/favicon.svg`、`/favicon.ico`、`/apple-touch-icon.png`、`/site.webmanifest`（MIME 均正确）；未命中路径（如 `/no-such-page-xyz`）回落 `index.html` 200 交由客户端 404 页处理
- [x] 带 `Origin: https://react.baiwumm.com` 打线上 Nest 的 CORS 回显正常（域名未变，Nest 侧无需改动）——两端 `GET /api/health` 均正确回显各自 Origin
- [x] **Web Analytics 生效**：`/_vercel/insights/script.js` 两端均 200 `application/javascript`（此前为 404），线上主包内含该 script 的加载逻辑（`va.vercel-scripts.com` 端点字符串各 1 处）——`@vercel/analytics` 由 JS 运行期注入 script，故 HTML 里没有静态标签属正常
- [x] Dashboard → Analytics 面板看到真实 PV（curl 不执行 JS，需真实浏览器访问；数据入库有几分钟延迟）——2026-11-03 用户确认面板已打开且可见真实 PV
- [x] GUI 走查：快捷登录可用 / 深链刷新后状态不丢 / 控制台无报错——2026-11-03 用户验收通过

### 2.5 回滚

Vercel Dashboard → Deployments → 上一成功版本 → **Instant Rollback**。若需退回 Cloudflare Workers，先从 git 历史恢复被删的 `wrangler.jsonc`（2026-11-02 之前的版本）再 `npx wrangler deploy`。

---

## 3 · Vue（Vercel，2026-11-02 自 CF Workers 迁入）

同 React **全套口径**：平台 Vercel / Root Directory `apps/vue` / `apps/vue/vercel.json`（同款 `rewrites` SPA 回退）/ 部署与回滚步骤一致；域名 `https://vue.baiwumm.com`，CF DNS 侧同样是 CNAME 指向 Vercel + **DNS only 灰云**。

- `VITE_API_BASE_URL`：`apps/vue/.env.example` 模板已是线上值，构建时仍需确认一遍（同样构建期注入）。
- 冒烟清单同 React §2.3（域名换 vue.baiwumm.com），迁移复验同 React §2.4。

### 3.1 上线后冒烟清单（✅ 2026-09-23 于 CF Workers 实测全绿，历史记录保留；迁 Vercel 后复验见 React §2.4）

- [x] 首页 `https://vue.baiwumm.com` 200（text/html）
- [x] **SPA 深链回退**：`/settings/users`、`/org/depts`、`/playground/okr-tree`、`/sign-in` 直开全部 200 + HTML，不 404
- [x] 产物 API 地址核验：递归爬取线上全部 16 个 JS chunk——`/assets/api-client-*.js` 确认指向 `https://nest.baiwumm.com`，`localhost` 零命中
- [x] 图标 / manifest：`favicon.ico` / `favicon.svg` / `favicon-96x96.png` / `apple-touch-icon.png` / `site.webmanifest` 全部 200 + 正确 MIME
- [x] 跨域实际请求：带 `Origin: https://vue.baiwumm.com` 打线上 Nest，`Access-Control-Allow-Origin` 正确回显
- [x] 浏览器走查 ✅（2026-09-23 用户完成）：演示快捷登录可用 / 写操作弹 DEMO_READONLY 提示 / 控制台无 CORS 报错 / 视觉走查

---

## 4 · Next.js（Vercel）

| 项 | 值 |
| --- | --- |
| 平台 | Vercel |
| 域名 | `https://next.baiwumm.com` |
| Root Directory | `apps/next` |
| 构建 | Vercel 自动识别 Next，无需自定义命令 |

### 4.1 环境变量表（Vercel Project → Settings → Environment Variables）

| 变量 | 必填 | 取值说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | 6543 transaction pooler；禁带 `sslmode` |
| `JWT_SECRET` | ✅ | 强随机（缺失显式抛错） |
| `JWT_REFRESH_SECRET` | 建议 | 独立强随机；留空回退 `JWT_SECRET` |
| `JWT_EXPIRES_IN` / `REFRESH_EXPIRES_IN` / `REFRESH_EXPIRES_IN_SHORT` | 可省 | 默认 `1h` / `30d` / `1d` |
| `SUPABASE_URL` | ✅ | 头像上传中转 |
| `SUPABASE_SECRET_KEY` | ✅ | `sb_secret_` 前缀 |
| `DEMO_MODE` | ✅ | `true`（演示口径，行为与 Nest 同名变量一致） |
| `LOG_RETENTION_DAYS` | 可省 | 默认 30；供 GitHub Actions `clean-logs.yml`（已改手动 `workflow_dispatch` 补跑）直连库清理用 |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_DESC` | 可省 | 浏览器可见，仅非敏感 |

### 4.2 上线后冒烟清单（✅ 2026-09-23 实测全绿，浏览器 GUI 走查由用户执行）

- [x] 首页 200（SSR 正常，32KB HTML 含品牌标识；首次请求 ~3s 属冷启动，后续 <1s）
- [x] 深链 SSR：`/settings/users`、`/settings/roles`、`/logs`、`/sign-in` 全部 200
- [x] 真实 admin 登录 200（Next 自己的 `/api/auth/login`，accessToken 正常签发）+ `GET /api/auth/me` 回显 admin
- [x] 数据接口抽样：`/api/stats/overview` 200（真实聚合）、`/api/users` / `/api/roles` / `/api/logs` 200 + 共库真实数据——⚠️ 冒烟脚本注意 **`pageSize` 白名单只收 10/20/30/40/50**，传其他值会被 `VALIDATION_ERROR` 正确拒绝（预期校验行为，非缺陷）
- [x] 演示快捷登录：`POST /api/auth/demo-login`（body `{"kind":"random"}`）200，随机演示账号签发正常——`DEMO_MODE=true` 生效
- [x] 演示只读：带 demo token `POST /api/users` → 403 `DEMO_READONLY`
- [x] 头像上传走通（Storage 中转）✅（2026-09-23 用户完成）
- [x] 无 500 / 水合报错（控制台）✅（2026-09-23 用户完成）
- [x] 防火墙限流生效（2026-10-14）：`POST /api/auth/login` 25 并发失败登录 → 20×401 + 5×429，窗口过后恢复 401（规则见 §0.3）

### 4.3 回滚

Vercel Dashboard → Deployments → 上一成功版本 → **Instant Rollback**。

---

## 5 · Nuxt（Vercel）

| 项 | 值 |
| --- | --- |
| 平台 | Vercel（Nitro node preset） |
| 域名 | `https://nuxt.baiwumm.com` |
| Root Directory | `apps/nuxt` |

### 5.1 环境变量表

| 变量 | 必填 | 取值说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | 6543 transaction pooler；禁带 `sslmode` |
| `JWT_SECRET` | ✅ | 强随机 |
| `JWT_REFRESH_SECRET` | 建议 | 独立强随机；留空回退 |
| `JWT_EXPIRES_IN` / `REFRESH_EXPIRES_IN` / `REFRESH_EXPIRES_IN_SHORT` | 可省 | 默认 `1h` / `30d` / `1d` |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | ✅ | 同 Next 口径（`sb_secret_`） |
| `SUPABASE_AVATAR_BUCKET` | 可省 | 默认 `avatars` |
| `DEMO_MODE` | ✅ | `true`（演示口径） |
| `NUXT_PUBLIC_APP_NAME` / `NUXT_PUBLIC_APP_DESC` | 可省 | 浏览器可见 |
| `NUXT_PUBLIC_API_BASE_URL` | 可省 | 默认 `/api`（同源，勿改） |

> 注意：本地该端读 `.env`（c12 不读 `.env.local`）；Vercel 上直接配置到 Environment Variables 即可。

### 5.2 上线后冒烟清单（✅ 2026-09-23 实测全绿，浏览器 GUI 走查由用户执行）

- [x] 首页 200（SPA 壳 ~10.7KB；D1 拍板 `ssr:false`，数据验证走 API）
- [x] 深链 SPA 回退：`/settings/users`、`/settings/roles`、`/logs`、`/sign-in` 全部 200
- [x] 真实 admin 登录 200（Nuxt 自己的 `/api/auth/login`，DATABASE_URL=6543 连库正常）+ `GET /api/auth/me` 回显 admin
- [x] 数据接口抽样（pageSize 用白名单值 10）：`/api/stats/overview` 真实聚合、users / logs 各 10 条、roles 6 条——共库读取正常
- [x] 演示快捷登录 200（随机演示账号）+ demo token 写请求 → 403 `DEMO_READONLY`
- [x] 头像上传走通（Storage 中转）✅（2026-09-23 用户完成）
- [x] 无 500 / 控制台报错 ✅（2026-09-23 用户完成）
- [x] 防火墙限流生效（2026-10-14）：`POST /api/auth/login` 25 并发失败登录 → 20×401 + 5×429，窗口过后恢复 401（规则见 §0.3）

> 实测备注：首次登录 ~7s 为 Vercel 冷启动 + Supavisor 6543 建连叠加，属预期；后续请求正常。

### 5.3 回滚

Vercel Instant Rollback。

---

## 6 · website 文档站（Cloudflare Workers 静态导出，2026-09-23 由 Vercel 改判）

| 项 | 值 |
| --- | --- |
| 平台 | CF Workers（Git 集成 Workers Builds） |
| 域名 | `https://better-admin.baiwumm.com` |
| Root Directory | `apps/website` |
| 构建 | `pnpm run build`（`next.config.mjs` 已配 `output:'export'` 静态导出到 `./out`） |
| 部署 | `npx wrangler deploy`（读 `apps/website/wrangler.jsonc`：`assets.directory=./out` + `not_found_handling=404-page`） |
| name 对齐 | wrangler.jsonc 的 `name`（`better-admin-website`）必须与 CF Dashboard 项目同名，不一致改一处即可 |
| 环境变量 | **无密钥变量**，无需配置 |

改造说明（2026-09-23，参照 react-okr-tree 站同款链路）：`output:'export'` + `trailingSlash` + `images.unoptimized`；搜索 `/api/search` 改 `force-static` + `staticGET`（构建期固化为 `out/api/search` 静态索引，前端 RootProvider `type:'static'` 浏览器本地搜索）；`opengraph-image` / `robots.txt` / `sitemap.xml` 显式 `force-static` 构建期预渲染；未命中路径回 `out/404.html`。全程无 server 运行时。CI 的 `pnpm version` 注意：website 已钉 `packageManager: pnpm@11.24.0`。

冒烟清单（✅ 2026-09-23 实测全绿，浏览器 GUI 走查由用户执行）：

- [x] 首页 200（111KB 完整 HTML）
- [x] 文档页：`/docs`、`/docs/architecture/api`、`/docs/progress/feature-matrix` 全部 200（trailingSlash 形态正常）
- [x] 搜索静态索引：`GET /api/search` 200（763KB Orama JSON），前端浏览器本地搜索
- [x] robots.txt（sitemap 指向线上域）/ sitemap.xml / og 图（真 PNG 32KB）全 200
- [x] 未命中路径 → 404 + `out/404.html` 内容（not_found_handling=404-page 生效）
- [x] favicon.ico / favicon.svg / apple-touch-icon 全 200（website 端无 site.webmanifest 且 head 未声明，N/A）
- [x] 浏览器走查 ✅（2026-09-23 用户完成）：站内搜索交互 / 深浅色 / 视觉

回滚：`npx wrangler versions rollback`。

---

## 7 · 收官：线上契约冒烟（四端全部上线后）

```bash
# 本地执行；CONTRACT_USER=admin，CONTRACT_PASSWORD 从 apps/nest/.env 读取（勿写进命令行历史）
cd apps/nuxt
CONTRACT_USER=admin CONTRACT_PASSWORD="$(grep -m1 '^CONTRACT_PASSWORD=' ../nest/.env | cut -d= -f2- | tr -d '"' | tr -d '\r')" \
  node scripts/contract-diff.mjs https://nuxt.baiwumm.com/api https://nest.baiwumm.com/api
```

- 即台账既定的「双端契约冒烟上线后全量跑」：openapi v1.14.0 全部只读 GET（31 步）对**线上地址**做结构 diff。
- 退出码 0 = 一致（`/permissions` label 中英文为已登记既有差异，自动放行）。
- 结果记入下表：

| 项 | 结果 | 执行时间 | 备注 |
| --- | --- | --- | --- |
| 线上 contract-diff（31 步） | ✅ 退出码 0，30 OK + 1 KNOWN（`/permissions` label 中英文既有差异） | 2026-09-23 | nuxt.baiwumm.com/api vs nest.baiwumm.com/api，全部端点响应结构一致 |

### 上线收官总勾选表

| 顺序 | 端 | 部署 | 冒烟 | 回滚就绪 |
| --- | --- | --- | --- | --- |
| ①② | nest + 保活 | ☑ 2026-09-23 | ☑ 2026-09-23 全绿 | ☑ |
| ③ | react | ☑ 2026-09-23 | ☑ 2026-09-23 HTTP 层全绿 | ☑ |
| ③ | vue | ☑ 2026-09-23 | ☑ 2026-09-23 HTTP 层全绿 | ☑ |
| ④ | next | ☑ 2026-09-23 | ☑ 2026-09-23 HTTP 层全绿 | ☑ |
| ④ | nuxt | ☑ 2026-09-23 | ☑ 2026-09-23 HTTP 层全绿 | ☑ |
| ⑤ | website | ☑ 2026-09-23 | ☑ 2026-09-23 HTTP 层全绿 | ☑ |
| ⑥ | 线上 contract-diff | — | ☑ 2026-09-23（退出码 0，见上方 §7 记录） | — |

> 引用：硬性规则见 [`AGENTS.md`](../AGENTS.md)（§9 环境变量、§17 部署规范）；业务真源见 [`docs/requirements.md`](./requirements.md)；UI 规范见 [`docs/ui-spec.md`](./ui-spec.md)。
