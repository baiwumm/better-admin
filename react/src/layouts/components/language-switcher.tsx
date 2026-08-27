import { Dropdown, Label, Button } from "@heroui/react";
import { Check, Languages } from "lucide-react";

import { useTranslation, type Language } from "@/i18n";
import { useLanguageStore } from "@/stores/language-store";

/** 菜单选项顺序与 i18n config 的 SUPPORTED_LANGUAGES 保持一致。 */
const LANGUAGE_OPTIONS: readonly { labelKey: string; value: Language }[] = [
  { labelKey: "common.language.zhCN", value: "zh-CN" },
  { labelKey: "common.language.en", value: "en" },
];

/**
 * 语言切换器：Header 右侧的图标按钮（偏好设置左侧），下拉选择 简体中文 / English。
 * 切换经 language-store 持久化并联动 i18next 与 html lang，URL 不变，刷新后保持。
 *
 * Dropdown.Trigger 内部是 react-aria 裸 Button（不接受 HeroUI 的 variant props），
 * 视觉上用 buttonVariants({ variant: "ghost", isIconOnly: true }) 对齐顶栏其它图标按钮。
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label={t("common.language.switch")}
        variant="ghost"
      >
        <Languages />
      </Button>
      <Dropdown.Popover className="min-w-40">
        <Dropdown.Menu onAction={(key) => setLanguage(key as Language)}>
          {LANGUAGE_OPTIONS.map(({ labelKey, value }) => {
            const label = t(labelKey);

            return (
              <Dropdown.Item key={value} id={value} textValue={label}>
                <span className="flex w-full items-center gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {language === value ? <Check className="size-4" /> : null}
                  </span>
                  <Label>{label}</Label>
                </span>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
