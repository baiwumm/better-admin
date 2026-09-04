"use client";

import { Dropdown, Header, Label, Button } from "@heroui/react";
import { Languages } from "lucide-react";

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
 * 选中态用 Menu 受控单选（selectionMode="single" + selectedKeys）驱动官方
 * Dropdown.ItemIndicator 渲染勾选，语言项归入 Dropdown.Section 并以 Header
 * 标题分区；默认 toggle 行为下点击已选项产生的空选由 onSelectionChange
 * 守卫忽略（受控 selectedKeys 保证勾选始终与当前语言一致）。
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
        size="sm"
        variant="ghost"
      >
        <Languages />
      </Button>
      <Dropdown.Popover className="min-w-40">
        <Dropdown.Menu
          selectedKeys={[language]}
          selectionMode="single"
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const key = [...keys][0];

            if (typeof key === "string") setLanguage(key as Language);
          }}
        >
          <Dropdown.Section>
            <Header>{t("common.language.choose")}</Header>
            {LANGUAGE_OPTIONS.map(({ labelKey, value }) => {
              const label = t(labelKey);

              return (
                <Dropdown.Item key={value} id={value} textValue={label}>
                  <Dropdown.ItemIndicator />
                  <Label>{label}</Label>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
