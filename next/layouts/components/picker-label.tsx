import { Label, Tooltip } from "@heroui/react";
import { Info } from "lucide-react";

import { useTranslation } from "@/i18n";

type PickerLabelProps = {
  /** 标题的 i18n key */
  labelKey: string;
  /** 说明文案的 i18n key：提供时在标题旁显示 Info 图标，hover 以 Tooltip 展示。 */
  tooltipKey?: string;
};

/**
 * 偏好设置配置项标题：Label + 可选 Tooltip 说明。
 * 统一替代「Label + Description 常驻描述」的形态，减少抽屉内的视觉噪音。
 */
export function PickerLabel({ labelKey, tooltipKey }: PickerLabelProps) {
  const { t } = useTranslation();
  const label = t(labelKey);

  return (
    <div className="flex items-center gap-1">
      <Label>{label}</Label>
      {tooltipKey && (
        <Tooltip delay={150}>
          <Tooltip.Trigger className="flex">
            <Info
              aria-label={`${label}${t("layout.prefs.ariaHint")}`}
              className="size-3.5 text-muted transition-colors hover:text-foreground"
            />
          </Tooltip.Trigger>
          <Tooltip.Content placement="top">{t(tooltipKey)}</Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
