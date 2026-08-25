import {
  Button,
  Drawer,
  Label,
  Radio,
  RadioGroup,
  useOverlayState,
  useTheme,
  Description,
  cn,
} from "@heroui/react";
import { Monitor, Moon, PaintBucket, Sun, Check } from "lucide-react";

import {
  ThemePreviewDark,
  ThemePreviewLight,
  ThemePreviewSystem,
} from "./theme-preview";

type ThemeMode = "system" | "light" | "dark";

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  icon: typeof Monitor;
  preview: typeof ThemePreviewSystem;
}[] = [
  {
    value: "system",
    label: "跟随系统",
    icon: Monitor,
    preview: ThemePreviewSystem,
  },
  { value: "light", label: "浅色", icon: Sun, preview: ThemePreviewLight },
  { value: "dark", label: "深色", icon: Moon, preview: ThemePreviewDark },
];

/**
 * 主题设置抽屉：右上角 paint-bucket 图标按钮（Drawer.Trigger）触发，
 * 从右侧弹出抽屉，标题「主题设置」。
 * 浮层开合状态使用 useOverlayState（Hero UI 官方用法：状态挂 Backdrop）。
 *
 * 抽屉内提供「主题模式」选择器（System / Light / Dark），
 * 结构参照 better-auth-ui 的 Appearance 组件（RadioGroup + Radio + 预览），
 * 预览图从 better-nuxt 的 ThemePreview*.vue 移植为 React SVG 组件。
 */
export function ThemeSettingsDrawer() {
  // 主题设置抽屉状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop）
  const themeDrawer = useOverlayState();
  const { setTheme, theme } = useTheme("system");

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
              <Drawer.Heading>偏好设置</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              {/* 主题模式 */}
              <RadioGroup
                aria-label="主题模式"
                value={theme}
                variant="secondary"
                onChange={setTheme}
              >
                <Label className="text-muted">主题模式</Label>
                <div className="grid gap-x-3 grid-cols-3">
                  {THEME_OPTIONS.map(
                    ({ value, label, icon: Icon, preview: Preview }) => (
                      <div key={value} className="flex flex-col gap-2">
                        <Radio
                          className={cn(
                            "relative p-0 rounded-md mt-2",
                            "border border-default data-[selected=true]:border-accent data-[selected=true]:bg-accent/10",
                            "data-[focus-visible=true]:border-accent data-[focus-visible=true]:bg-accent/10",
                          )}
                          value={value}
                        >
                          <Radio.Control className="absolute top-1 right-1 z-1">
                            <Radio.Indicator>
                              {({ isSelected }) =>
                                isSelected ? (
                                  <Check
                                    className="text-background"
                                    size={12}
                                  />
                                ) : null
                              }
                            </Radio.Indicator>
                          </Radio.Control>
                          <Radio.Content className="flex flex-col gap-1">
                            <Preview className="w-full" />
                            <div className="flex gap-1 items-center justify-center w-full my-1">
                              <Icon className="text-muted" size={16} />
                              <Description>{label}</Description>
                            </div>
                          </Radio.Content>
                        </Radio>
                      </div>
                    ),
                  )}
                </div>
              </RadioGroup>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
