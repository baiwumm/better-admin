import { Switch } from "@heroui/react";
import { Check, X } from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useTranslation } from "@/i18n";
import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 「显示多标签页」配置项：控制顶栏下方多标签页栏的显隐。
 * 关闭仅隐藏 UI，不清空已打开的标签数据（重新开启后原标签仍在）。
 */
export function ShowTabsPicker() {
  const showTabs = useDesignThemeStore((s) => s.showTabs);
  const setShowTabs = useDesignThemeStore((s) => s.setShowTabs);
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4">
      <PickerLabel
        labelKey="layout.prefs.showTabs.label"
        tooltipKey="layout.prefs.showTabs.tooltip"
      />

      {/* Hero UI Switch：Label 与可点击开关同为 Switch.Root 子元素 */}
      <Switch
        aria-label={t("layout.prefs.showTabs.label")}
        isSelected={showTabs}
        onChange={setShowTabs}
      >
        {({ isSelected }) => (
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb>
                <Switch.Icon>
                  {isSelected ? (
                    <Check className="size-3 text-inherit opacity-100" />
                  ) : (
                    <X className="size-3 text-inherit opacity-70" />
                  )}
                </Switch.Icon>
              </Switch.Thumb>
            </Switch.Control>
          </Switch.Content>
        )}
      </Switch>
    </div>
  );
}
