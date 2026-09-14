import { I18nProvider, toast } from "@heroui/react";
import { I18nextProvider } from "react-i18next";

import { i18n } from "@/i18n";
import { useLanguageStore } from "@/stores/language-store";

/**
 * 禁用 HeroUI toast 的根级 ViewTransition。
 *
 * HeroUI toast 队列默认把每次增删都包进 document.startViewTransition（根级 VT，
 * toast-queue 的 defaultWrapUpdate）。VT 是文档级唯一资源：toast 的 VT 会与路由/
 * 主题 VT 互相抢占，且其新旧帧合成在亮色主题下会产生全页鬼影/闪动（表现为弹
 * toast 时页面「原地浮一下」，弹出、消失各一次）。
 *
 * toast 的底层 stately 队列把 wrapUpdate 存为实例属性（TS 标记 private 仅编译期），
 * 启动时覆写为直通函数即可让 toast 增删走普通状态更新——即时出现/消失，无 VT，
 * 与路由动画彻底解耦。此补丁需在首次 toast 之前执行（Provider 挂载即生效）。
 */
function disableToastViewTransition() {
  type StatelyQueueWithWrapUpdate = {
    wrapUpdate?: (fn: () => void, action: string) => void;
  };
  const statelyQueue =
    toast.getQueue() as unknown as StatelyQueueWithWrapUpdate;

  statelyQueue.wrapUpdate = (fn) => fn();
}

disableToastViewTransition();

export function Provider({ children }: { children: React.ReactNode }) {
  // react-aria 的 locale：供 HeroUI / 日期数字格式等第三方内在文案使用
  const language = useLanguageStore((s) => s.language);

  return (
    // 项目使用自建 i18next 实例（config.ts），必须经 Provider 注入，
    // 否则 useTranslation 会落到未初始化的全局单例上
    <I18nextProvider i18n={i18n}>
      <I18nProvider locale={language}>{children}</I18nProvider>
    </I18nextProvider>
  );
}
