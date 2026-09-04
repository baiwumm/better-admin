"use client";

import { Description, Radio, RadioGroup } from "@heroui/react";
import {
  Circle,
  type LucideIcon,
  Square,
  SquareRoundCorner,
  Squircle,
} from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTranslation } from "@/i18n";
import { RADII, type RadiusId } from "@/themes/radius";

/** 各档位图标：直角方 → 带圆角方 → 超椭圆 → 全圆，视觉上按圆角递进 */
const RADIUS_ICONS: Record<RadiusId, LucideIcon> = {
  none: Square,
  small: SquareRoundCorner,
  medium: Squircle,
  large: Circle,
};

/**
 * 圆角选择器：四档单选（直角 / 小圆角 / 中圆角 / 大圆角），图标 + 文字格式
 * 与页面切换速度等选择器保持一致。
 * 通过 html[data-radius] 属性覆盖 --radius / --field-radius 基准变量，
 * 全站圆角整体缩放（HeroUI 圆角刻度均由 --radius 派生）；
 * 选择结果持久化到 localStorage，即时生效（无揭示动画）。
 */
export function RadiusPicker() {
  const radius = useDesignThemeStore((s) => s.radius);
  const setRadius = useDesignThemeStore((s) => s.setRadius);
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.radius.label")}
      value={radius}
      variant="secondary"
      onChange={(value) => setRadius(value as RadiusId)}
    >
      <PickerLabel
        labelKey="layout.prefs.radius.label"
        tooltipKey="layout.prefs.radius.tooltip"
      />
      <div className="mt-2 grid grid-cols-4 gap-2">
        {RADII.map(({ id, labelKey }) => {
          const Icon = RADIUS_ICONS[id];

          return (
            <Radio key={id} className="mt-0" value={id}>
              <Radio.Content className="w-full rounded-lg border border-default px-1 py-2 transition-all data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 hover:scale-105">
                <div className="flex w-full min-w-0 items-center justify-center gap-1">
                  <Icon className="shrink-0" size={14} />
                  <Description className="truncate">{t(labelKey)}</Description>
                </div>
              </Radio.Content>
            </Radio>
          );
        })}
      </div>
    </RadioGroup>
  );
}
