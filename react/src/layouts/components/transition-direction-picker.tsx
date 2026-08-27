import { Description, RadioGroup, Radio, cn } from "@heroui/react";
import {
  ArrowDownUp,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpDown,
} from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTranslation } from "@/i18n";
import { type TransitionDirection } from "@/themes/transition-direction";

const DIRECTION_OPTIONS: {
  value: TransitionDirection;
  labelKey: string;
  icon: typeof ArrowLeftRight;
}[] = [
  {
    value: "ltr",
    labelKey: "layout.prefs.direction.ltr",
    icon: ArrowLeftRight,
  },
  {
    value: "rtl",
    labelKey: "layout.prefs.direction.rtl",
    icon: ArrowRightLeft,
  },
  { value: "ttb", labelKey: "layout.prefs.direction.ttb", icon: ArrowUpDown },
  { value: "btt", labelKey: "layout.prefs.direction.btt", icon: ArrowDownUp },
];

/**
 * 主题动画方向选择器：ltr / rtl / ttb / btt。
 * 切换主题色或主题模式时，ViewTransition 的 clip-path 揭示方向。
 */
export function TransitionDirectionPicker() {
  const transitionDirection = useDesignThemeStore((s) => s.transitionDirection);
  const setTransitionDirection = useDesignThemeStore(
    (s) => s.setTransitionDirection,
  );
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.direction.label")}
      value={transitionDirection}
      variant="secondary"
      onChange={(value) => setTransitionDirection(value as TransitionDirection)}
    >
      <PickerLabel
        labelKey="layout.prefs.direction.label"
        tooltipKey="layout.prefs.direction.tooltip"
      />
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 mt-2">
        {DIRECTION_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
          <Radio key={value} className="mt-0" value={value}>
            <Radio.Content
              className={cn(
                "group w-full rounded-lg border border-default px-1 py-2 transition-all",
                "data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 hover:scale-105",
              )}
            >
              <div className="min-w-0 flex items-center justify-center w-full gap-1">
                <Icon className="shrink-0" size={14} />
                <Description className="truncate">{t(labelKey)}</Description>
              </div>
            </Radio.Content>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
