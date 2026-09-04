"use client";

import { Description, Radio, RadioGroup, cn } from "@heroui/react";
import {
  Aperture,
  Ban,
  ChevronsRight,
  Contrast,
  Focus,
  MoveHorizontal,
  MoveUp,
  Scan,
  ZoomIn,
} from "lucide-react";

import { PickerLabel } from "./picker-label";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTranslation } from "@/i18n";
import {
  ROUTE_TRANSITIONS,
  type RouteTransitionId,
} from "@/themes/route-transitions";

const ROUTE_ICONS: Record<RouteTransitionId, typeof Ban> = {
  none: Ban,
  fade: Contrast,
  glide: MoveHorizontal,
  rise: MoveUp,
  zoom: ZoomIn,
  reveal: Scan,
  cover: ChevronsRight,
  circle: Aperture,
  blur: Focus,
};

/**
 * 页面切换动画选择器：Radio 单选（与「主题动画方向」选择器同形态）。
 * 预设见 src/themes/route-transitions.ts（9 种动画）。
 * 选择结果持久化到 localStorage（design-theme-store），
 * 并同步写入 <html data-route-transition> 供 CSS 生效。
 */
export function RouteTransitionPicker() {
  const routeTransition = useDesignThemeStore((s) => s.routeTransition);
  const setRouteTransition = useDesignThemeStore((s) => s.setRouteTransition);
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("layout.prefs.routeTransition.label")}
      value={routeTransition}
      variant="secondary"
      onChange={(value) => setRouteTransition(value as RouteTransitionId)}
    >
      <PickerLabel
        labelKey="layout.prefs.routeTransition.label"
        tooltipKey="layout.prefs.routeTransition.tooltip"
      />
      <div className="grid gap-2 grid-cols-3 mt-2">
        {ROUTE_TRANSITIONS.map(({ id, labelKey }) => {
          const Icon = ROUTE_ICONS[id];

          return (
            <Radio key={id} className="mt-0" value={id}>
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
          );
        })}
      </div>
    </RadioGroup>
  );
}
