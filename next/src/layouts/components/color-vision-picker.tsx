"use client";

import type { ColorVisionMode } from "@/stores/design-theme-store";

import { Description, Radio, RadioGroup } from "@heroui/react";
import { Contrast, Eye, Glasses, type LucideIcon } from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useTranslation } from "@/i18n";
import { useDesignThemeStore } from "@/stores/design-theme-store";

const COLOR_VISION_OPTIONS: { id: ColorVisionMode; labelKey: string }[] = [
  { id: "normal", labelKey: "layout.prefs.colorVision.normal" },
  { id: "grayscale", labelKey: "layout.prefs.colorVision.grayscale" },
  { id: "color-weak", labelKey: "layout.prefs.colorVision.colorWeak" },
];

const COLOR_VISION_ICONS: Record<ColorVisionMode, LucideIcon> = {
  normal: Eye,
  grayscale: Contrast,
  "color-weak": Glasses,
};

/**
 * 色彩模式选择器：三档单选（正常 / 灰色 / 色弱）。
 * 通过 html[data-color-vision] 属性驱动 styles/color-vision.css 的滤镜规则
 * （灰色整体去色；色弱用 SVG feColorMatrix 近似红绿色弱补色）；持久化到 localStorage。
 * 切换时跟随「主题动画方向」播放一次全页揭示动画（与主题色/主题模式一致）。
 */
export function ColorVisionPicker() {
  const colorVision = useDesignThemeStore((s) => s.colorVision);
  const setColorVision = useDesignThemeStore((s) => s.setColorVision);
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.colorVision.label")}
      value={colorVision}
      variant="secondary"
      onChange={(value) => setColorVision(value as ColorVisionMode)}
    >
      <PickerLabel
        labelKey="layout.prefs.colorVision.label"
        tooltipKey="layout.prefs.colorVision.tooltip"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        {COLOR_VISION_OPTIONS.map(({ id, labelKey }) => {
          const Icon = COLOR_VISION_ICONS[id];

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
