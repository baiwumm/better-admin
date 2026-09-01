import { redirect } from "next/navigation";

import { AuthPageShell } from "./auth-page-shell";

import { getSessionUser } from "@/lib/server/auth/request-auth";
import { ENV } from "@/lib/env";

/** 品牌区 4 个特性 chip（多技术栈 + 关键能力；labelKey 在壳内经 t() 取词） */
const BRAND_CHIPS = [
  "auth.brand.chip.stacks",
  "auth.brand.chip.rbac",
  "auth.brand.chip.storage",
  "auth.brand.chip.deploy",
] as const;

/**
 * 认证页统一布局（RSC）：
 * - 反向守卫：已登录（access Cookie 验签 + token_version 实时比对）访问
 *   任一认证页 → 直接 redirect 首页（等价 React 版 (auth) beforeLoad，
 *   判定移到服务端，不再依赖客户端 store，规避水合闪烁）；
 * - 品牌区数据为静态内容，服务端渲染。
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await getSessionUser()) {
    redirect("/");
  }

  return (
    <AuthPageShell
      appName={ENV.appName}
      brandChips={BRAND_CHIPS}
      copyright={
        <>
          © {new Date().getFullYear()} by{" "}
          <a
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
            href="https://github.com/baiwumm"
            rel="noreferrer"
            target="_blank"
          >
            baiwumm
          </a>
          . All rights reserved.
        </>
      }
    >
      {children}
    </AuthPageShell>
  );
}
