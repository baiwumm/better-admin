import { Description, Label, ListBox, Select, cn } from "@heroui/react";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import {
  ROUTE_TRANSITIONS,
  type RouteTransitionId,
} from "@/themes/route-transitions";

/**
 * 路由过渡动画选择器：HeroUI Select 下拉（单选）。
 * 预设见 src/themes/route-transitions.ts（6 种动画）。
 * 选择结果持久化到 localStorage（design-theme-store），
 * 并同步写入 <html data-route-transition> 供 CSS 生效。
 *
 * 注意：受控 Select 用 selectedKey + onSelectionChange（react-aria 约定）。
 */
export function RouteTransitionPicker() {
  const routeTransition = useDesignThemeStore((s) => s.routeTransition);
  const setRouteTransition = useDesignThemeStore((s) => s.setRouteTransition);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>路由过渡动画</Label>
      <Select
        aria-label="路由过渡动画"
        selectedKey={routeTransition}
        onSelectionChange={(key) => {
          if (key === null) return;

          setRouteTransition(key as RouteTransitionId);
        }}
      >
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Popover className="min-w-52">
          <ListBox
            aria-label="选择路由过渡动画"
            className="max-h-72 overflow-y-auto p-1"
          >
            {ROUTE_TRANSITIONS.map(({ id, label }) => (
              <ListBox.Item
                key={id}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm text-muted outline-none",
                  "data-[hovered=true]:bg-default/60 data-[hovered=true]:text-foreground",
                  "data-[focused=true]:bg-default/60 data-[focused=true]:text-foreground",
                  "data-[selected=true]:text-accent data-[selected=true]:bg-accent/10",
                  "data-[focus-visible=true]:bg-default/60",
                )}
                id={id}
                textValue={label}
              >
                {label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Description>页面切换时的过渡动画（可关闭）</Description>
    </div>
  );
}
