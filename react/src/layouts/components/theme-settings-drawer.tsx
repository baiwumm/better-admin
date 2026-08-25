import { Button, Drawer, useOverlayState } from "@heroui/react";
import { PaintBucket } from "lucide-react";

import { ThemeColorPicker } from "./theme-color-picker";
import { ThemeModePicker } from "./theme-mode-picker";
import { TransitionDirectionPicker } from "./transition-direction-picker";
import { RouteTransitionPicker } from "./route-transition-picker";
import { RouteTransitionSpeedPicker } from "./route-transition-speed-picker";

/**
 * 主题设置抽屉：右上角 paint-bucket 图标按钮（Drawer.Trigger）触发，
 * 从右侧弹出抽屉，标题「偏好设置」。
 * 浮层开合状态使用 useOverlayState（Hero UI 官方用法：状态挂 Backdrop）。
 *
 * 抽屉内的各配置项均抽为独立组件，后续新增配置项在此处追加即可：
 * - ThemeColorPicker  主题色
 * - ThemeModePicker   主题模式
 * - TransitionDirectionPicker  动画方向（主题切换的揭示方向）
 * - RouteTransitionPicker      路由过渡动画（页面切换）
 */
export function ThemeSettingsDrawer() {
  // 主题设置抽屉状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const themeDrawer = useOverlayState();

  return (
    <Drawer state={themeDrawer}>
      <Button isIconOnly variant="ghost">
        <PaintBucket />
      </Button>
      <Drawer.Backdrop
        isOpen={themeDrawer.isOpen}
        onOpenChange={themeDrawer.setOpen}
      >
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="font-bold">偏好设置</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="space-y-6">
              <ThemeColorPicker />
              <ThemeModePicker />
              <TransitionDirectionPicker />
              <RouteTransitionPicker />
              <RouteTransitionSpeedPicker />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
