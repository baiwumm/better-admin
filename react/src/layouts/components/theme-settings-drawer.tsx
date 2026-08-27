import { Button, Drawer, useOverlayState } from "@heroui/react";
import { PaintBucket, RotateCcw } from "lucide-react";
import { useCallback } from "react";

import { ColorVisionPicker } from "./color-vision-picker";
import { ThemeColorPicker } from "./theme-color-picker";
import { ThemeModePicker } from "./theme-mode-picker";
import { TransitionDirectionPicker } from "./transition-direction-picker";
import { RouteTransitionPicker } from "./route-transition-picker";
import { RouteTransitionSpeedPicker } from "./route-transition-speed-picker";
import { ShowTabsPicker } from "./show-tabs-picker";

import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 主题设置抽屉：右上角 paint-bucket 图标按钮（Drawer.Trigger）触发，
 * 从右侧弹出抽屉，标题「偏好设置」。
 * 浮层开合状态使用 useOverlayState（Hero UI 官方用法：状态挂 Backdrop）。
 *
 * 抽屉内的各配置项均抽为独立组件，后续新增配置项在此处追加即可：
 * - ThemeColorPicker           主题色
 * - ThemeModePicker            主题模式
 * - ColorVisionPicker          色彩模式（正常 / 灰色 / 色弱，全局滤镜）
 * - TransitionDirectionPicker  主题动画方向（主题色 / 模式切换的揭示方向）
 * - RouteTransitionPicker      页面切换动画（页面切换的过渡效果预设）
 * - RouteTransitionSpeedPicker 页面切换速度（仅作用于页面切换动画）
 * - ShowTabsPicker             显示多标签页（顶栏下方标签栏的显隐）
 *
 * 底部提供「重置设置」按钮：一键恢复全部偏好为初始状态（含主题模式回
 * 「跟随系统」），由 store 的 resetPreferences 在单次揭示动画内原子完成。
 */
export function ThemeSettingsDrawer() {
  // 主题设置抽屉状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const themeDrawer = useOverlayState();
  const resetPreferences = useDesignThemeStore((s) => s.resetPreferences);

  const handleReset = useCallback(() => {
    // 不在重置后弹 toast：HeroUI Toast 的进出动画内部走
    // document.startViewTransition，即使与主题 VT 错峰，其自身 VT 仍会让
    // main / 面包屑短暂形成独立快照组叠层。重置的揭示动画本身已是充分反馈。
    resetPreferences();
  }, [resetPreferences]);

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
              <ColorVisionPicker />
              <TransitionDirectionPicker />
              <RouteTransitionPicker />
              <RouteTransitionSpeedPicker />
              <ShowTabsPicker />
            </Drawer.Body>
            <Drawer.Footer>
              <Button fullWidth variant="danger" onPress={handleReset}>
                <RotateCcw className="shrink-0" size={16} />
                重置设置
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
