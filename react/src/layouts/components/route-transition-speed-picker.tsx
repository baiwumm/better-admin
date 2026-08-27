import { Description, Radio, RadioGroup } from "@heroui/react";
import { Gauge, Rabbit, Snail, type LucideIcon } from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTranslation } from "@/i18n";
import {
  ROUTE_TRANSITION_SPEEDS,
  type RouteTransitionSpeedId,
} from "@/themes/route-transitions";

const SPEED_ICONS: Record<RouteTransitionSpeedId, LucideIcon> = {
  slow: Snail,
  normal: Gauge,
  fast: Rabbit,
};

/**
 * 页面切换速度选择器：三档单选（慢速 / 标准 / 快速）。
 * 通过 html[data-rt-speed] 属性驱动 CSS 变量倍率（--rt-speed），
 * 缩放全部页面切换动画时长（不影响主题动画）；选择结果持久化到 localStorage。
 */
export function RouteTransitionSpeedPicker() {
  const routeTransitionSpeed = useDesignThemeStore(
    (s) => s.routeTransitionSpeed,
  );
  const setRouteTransitionSpeed = useDesignThemeStore(
    (s) => s.setRouteTransitionSpeed,
  );
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.speed.label")}
      value={routeTransitionSpeed}
      variant="secondary"
      onChange={(value) =>
        setRouteTransitionSpeed(value as RouteTransitionSpeedId)
      }
    >
      <PickerLabel
        labelKey="layout.prefs.speed.label"
        tooltipKey="layout.prefs.speed.tooltip"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ROUTE_TRANSITION_SPEEDS.map(({ id, labelKey }) => {
          const Icon = SPEED_ICONS[id];

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
