import { watch } from "vue";
import { useRoute } from "vue-router";

import { i18n } from "@/i18n";
import { ENV } from "@/lib/env";
import { resolveRouteTitleKey } from "@/lib/route-access";
import { useLanguageStore } from "@/stores/language-store";

/**
 * 同步浏览器标签页标题（React 端 lib/use-document-title 的 Vue 等价物，
 * 挂在根组件 App.vue 以覆盖登录页 / 错误页 / 管理区全部页面）：
 * 当前路径 → menu.pageTitle.* i18n 键（精确 + 前缀匹配，如公告详情复用
 * 列表页标题），翻译后拼接 `${页面标题} - ${ENV.appName}`；无键路径回退
 * `${ENV.appName}`。订阅路由与语言两个来源：导航与切换语言均即时刷新
 * （此前标题仅在 router.afterEach 设置，切语言不导航就不更新）。
 */
export function useDocumentTitle(): void {
  const route = useRoute();
  const language = useLanguageStore();

  watch(
    [() => route.path, () => language.locale],
    ([path]) => {
      const titleKey = resolveRouteTitleKey(path);
      const title = titleKey ? i18n.global.t(titleKey) : "";

      document.title = title ? `${title} - ${ENV.appName}` : ENV.appName;
    },
    { immediate: true },
  );
}
