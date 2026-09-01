import { Button, Drawer, toast, useOverlayState } from "@heroui/react";
import { PaintBucket, RotateCcw } from "lucide-react";
import { useCallback } from "react";

import { ColorVisionPicker } from "./color-vision-picker";
import { ThemeColorPicker } from "./theme-color-picker";
import { ThemeModePicker } from "./theme-mode-picker";
import { TransitionDirectionPicker } from "./transition-direction-picker";
import { RouteTransitionPicker } from "./route-transition-picker";
import { RouteTransitionSpeedPicker } from "./route-transition-speed-picker";
import { RadiusPicker } from "./radius-picker";
import { ShowTabsPicker } from "./show-tabs-picker";

import { useTranslation } from "@/i18n";
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
 * - RadiusPicker               圆角（直角 / 小 / 中 / 大，全站圆角整体缩放）
 * - ShowTabsPicker             显示多标签页（顶栏下方标签栏的显隐）
 *
 * 底部提供「重置设置」按钮：一键恢复全部偏好为初始状态（含主题模式回
 * 「跟随系统」），由 store 的 resetPreferences 在单次揭示动画内原子完成。
 */
export function ThemeSettingsDrawer() {
  // 主题设置抽屉状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const themeDrawer = useOverlayState();
  const resetPreferences = useDesignThemeStore((s) => s.resetPreferences);
  const { t } = useTranslation();

  const handleReset = useCallback(async () => {
    // 先等重置的揭示动画播完（resetPreferences 的 Promise 在动画完全结束后
    // resolve），再弹 toast 成功提示。此前刻意不弹 toast：HeroUI toast 的进出
    // 动画内部走 document.startViewTransition，会让 main / 面包屑短暂形成独立
    // 快照组叠层（即「浮顶」鬼影）。自禁用 toast 根级 VT（provider.tsx 的
    // disableToastViewTransition，改用纯 CSS 动画）后，该问题已解决，可放心
    // 弹出成功提示。
    await resetPreferences();
    toast.success(t("layout.prefs.resetSuccess"));
  }, [resetPreferences, t]);

  return (
    <Drawer state={themeDrawer}>
      <Button isIconOnly size="sm" variant="ghost">
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
              <Drawer.Heading className="font-bold">
                {t("layout.prefs.title")}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="space-y-6">
              <ThemeColorPicker />
              <ThemeModePicker />
              <ColorVisionPicker />
              <TransitionDirectionPicker />
              <RouteTransitionPicker />
              <RouteTransitionSpeedPicker />
              <RadiusPicker />
              <ShowTabsPicker />
            </Drawer.Body>
            <Drawer.Footer>
              <Button fullWidth variant="danger" onPress={handleReset}>
                <RotateCcw className="shrink-0" size={16} />
                {t("layout.prefs.reset")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
