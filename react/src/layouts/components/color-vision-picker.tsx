import type { ColorVisionMode } from "@/stores/design-theme-store";

import { Description, Radio, RadioGroup } from "@heroui/react";
import { Contrast, Eye, Glasses, type LucideIcon } from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useDesignThemeStore } from "@/stores/design-theme-store";

const COLOR_VISION_OPTIONS: { id: ColorVisionMode; label: string }[] = [
  { id: "normal", label: "正常模式" },
  { id: "grayscale", label: "灰色模式" },
  { id: "color-weak", label: "色弱模式" },
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

  return (
    <RadioGroup
      value={colorVision}
      variant="secondary"
      onChange={(value) => setColorVision(value as ColorVisionMode)}
    >
      <PickerLabel label="色彩模式" tooltip="仅调整全局色彩呈现" />
      <div className="mt-2 grid grid-cols-3 gap-2">
        {COLOR_VISION_OPTIONS.map(({ id, label }) => {
          const Icon = COLOR_VISION_ICONS[id];

          return (
            <Radio key={id} className="mt-0" value={id}>
              <Radio.Content className="w-full rounded-lg border border-default px-1 py-2 transition-all data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 hover:scale-105">
                <div className="flex w-full min-w-0 items-center justify-center gap-1">
                  <Icon className="shrink-0" size={14} />
                  <Description className="truncate">{label}</Description>
                </div>
              </Radio.Content>
            </Radio>
          );
        })}
      </div>
    </RadioGroup>
  );
}
