import { Radio, RadioGroup, Description, cn } from "@heroui/react";
import { Monitor, Moon, Sun, Check } from "lucide-react";

import { PickerLabel } from "./picker-label";
import {
  ThemePreviewDark,
  ThemePreviewLight,
  ThemePreviewSystem,
} from "./theme-preview";

import { useTranslation } from "@/i18n";
import { useThemeModeTransition } from "@/themes/use-theme-mode-transition";

type ThemeMode = "system" | "light" | "dark";

const THEME_OPTIONS: {
  value: ThemeMode;
  labelKey: string;
  icon: typeof Monitor;
  preview: typeof ThemePreviewSystem;
}[] = [
  {
    value: "system",
    labelKey: "layout.prefs.themeMode.system",
    icon: Monitor,
    preview: ThemePreviewSystem,
  },
  {
    value: "light",
    labelKey: "layout.prefs.themeMode.light",
    icon: Sun,
    preview: ThemePreviewLight,
  },
  {
    value: "dark",
    labelKey: "layout.prefs.themeMode.dark",
    icon: Moon,
    preview: ThemePreviewDark,
  },
];

/**
 * 主题模式选择器：System / Light / Dark。
 * 切换时通过 useThemeModeTransition 触发 ViewTransition 动画。
 */
export function ThemeModePicker() {
  const { theme, switchThemeMode } = useThemeModeTransition();
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.themeMode.label")}
      value={theme}
      variant="secondary"
      onChange={switchThemeMode}
    >
      <PickerLabel
        labelKey="layout.prefs.themeMode.label"
        tooltipKey="layout.prefs.themeMode.tooltip"
      />
      <div className="grid gap-x-3 grid-cols-3">
        {THEME_OPTIONS.map(
          ({ value, labelKey, icon: Icon, preview: Preview }) => (
            <div key={value} className="flex flex-col gap-2">
              <Radio
                className={cn(
                  "relative p-0 rounded-lg mt-2 hover:scale-105 transition-all",
                  "border border-default data-[selected=true]:border-accent data-[selected=true]:bg-accent/10",
                  "data-[focus-visible=true]:border-accent data-[focus-visible=true]:bg-accent/10",
                )}
                value={value}
              >
                <Radio.Control className="absolute top-1 right-1 z-1">
                  <Radio.Indicator>
                    {({ isSelected }) =>
                      isSelected ? (
                        <Check className="text-background" size={12} />
                      ) : null
                    }
                  </Radio.Indicator>
                </Radio.Control>
                <Radio.Content className="flex flex-col gap-1">
                  <Preview className="w-full rounded-lg" />
                  <div className="flex gap-1 items-center justify-center w-full my-1">
                    <Icon className="text-muted" size={16} />
                    <Description>{t(labelKey)}</Description>
                  </div>
                </Radio.Content>
              </Radio>
            </div>
          ),
        )}
      </div>
    </RadioGroup>
  );
}
