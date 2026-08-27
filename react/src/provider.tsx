import { I18nProvider } from "@heroui/react";
import { I18nextProvider } from "react-i18next";

import { i18n } from "@/i18n";
import { useLanguageStore } from "@/stores/language-store";

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
