"use client";

import type { MenuNode } from "@/lib/api-types";

import { useEffect } from "react";

import { ENV } from "@/lib/env";
import { getMenuLabel } from "@/lib/menu-i18n";
import { findActivePath } from "@/lib/menu-utils";
import { getRouteTitleKey } from "@/lib/route-title";
import { useTranslation } from "@/i18n";
import { useLanguageStore } from "@/stores/language-store";

/**
 * 页面标题（document.title）同步：
 * 标题三级回退——菜单树匹配叶子的名称（i18nKey 取词）→ 路由静态标题映射
 * （/account 等非菜单路由）→ 应用名。语言切换时立即刷新（不依赖导航）。
 *
 * Next 适配：React 版经 TanStack Router 的 staticData.titleKey 逐路由声明；
 * App Router 下标题统一由本 hook 在 Admin Shell 中按 pathname 派生，
 * 登录页等非管理区页面走根 layout 的 metadata（应用名兜底）。
 */
export function usePageTitle(menuTree: MenuNode[], pathname: string): void {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const activePath = findActivePath(menuTree, pathname);

    let title: string | null = null;

    if (activePath.length > 0) {
      // 菜单路由：取激活链最末叶子（ deepest match）
      let level = menuTree;
      let node = null;

      for (const id of activePath) {
        node = level.find((n) => n.id === id) ?? null;

        if (!node) break;
        level = node.children ?? [];
      }

      if (node) title = getMenuLabel(node, t);
    }

    if (title === null) {
      const titleKey = getRouteTitleKey(pathname);

      if (titleKey) title = t(titleKey);
    }

    document.title = title ? `${title} - ${ENV.appName}` : ENV.appName;
    // language 变化时取词结果不同，需重算（t 为固定引用故显式加入）
  }, [menuTree, pathname, t, language]);
}
