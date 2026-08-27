import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { ENV } from "@/lib/env";
import { t } from "@/i18n";
import { useLanguageStore } from "@/stores/language-store";

/** 全站静态数据统一形态：叶子页面标题的 i18n key（可选），供浏览器标签页标题使用 */
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** 浏览器标签页标题的翻译 key（如 menu.pageTitle.users），由 useDocumentTitle 统一取词拼接品牌名 */
    titleKey?: string;
  }
}

/**
 * 同步浏览器标签页标题：取当前最深匹配路由的 staticData.titleKey，
 * 翻译后拼接为 `${页面标题} - ${ENV.appName}`；未声明 titleKey 的路由回退显示 `${ENV.appName}`。
 * 必须挂在根路由（__root.tsx）才能覆盖登录页与错误页。
 * 订阅的是 router state（导航即时更新），与 keepAlive 页面实例挂载无关；
 * 同时订阅语言状态：切换语言时无需导航也立即刷新标题。
 */
export function useDocumentTitle(): void {
  const titleKey = useRouterState({
    select: (state) => {
      const deepest = state.matches[state.matches.length - 1];

      return deepest?.staticData?.titleKey;
    },
  });
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    document.title = titleKey ? `${t(titleKey)} - ${ENV.appName}` : ENV.appName;
  }, [titleKey, language]);
}
