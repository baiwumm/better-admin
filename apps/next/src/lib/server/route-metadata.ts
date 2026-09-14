import "server-only";

import type { Metadata } from "next";

import { cookies } from "next/headers";

import { createI18nInstance } from "@/i18n/config";
import { LANGUAGE_COOKIE_NAME } from "@/stores/language-store";

/**
 * 路由级服务端标题（对齐 React 端 TanStack Router 的 staticData.titleKey
 * 逐路由声明，titleKey 与 React 完全同源）。
 *
 * 各叶子路由 page.tsx 导出 `generateMetadata` 调用本函数，把正确标题渲染进
 * 初始 HTML——刷新 / 直链 / 分享场景首帧标题即正确（此前为「应用名 → 客户端
 * hook 改写」两段式）；客户端导航时 Next 也会把 metadata 纳入 RSC 载荷更新
 * document.title。与 admin-shell 的 usePageTitle 并存：hook 负责运行期语言
 * 切换即时刷新与非菜单路由的 label 兜底，两者消费同一套 i18n key，终态一致。
 *
 * 语言从语言 Cookie 读取，经 createI18nInstance 创建服务端独立实例取词
 * （跨请求无语言污染；无 Cookie 时函数内回退默认语言）。仅读 Cookie 与
 * 内存资源，无 DB / 网络开销。
 *
 * @param titleKey 扁平 i18n 键（与 React 端 staticData.titleKey 一字不差）
 */
export async function generateRouteMetadata(
  titleKey: string,
): Promise<Metadata> {
  const language = (await cookies()).get(LANGUAGE_COOKIE_NAME)?.value;
  const t = createI18nInstance(language).t;

  // 返回字符串标题，由根 layout 的 title.template（%s - 应用名）拼接后缀
  return { title: t(titleKey) };
}
