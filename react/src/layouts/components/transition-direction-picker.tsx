import { Description, Label, RadioGroup, Radio, cn } from "@heroui/react";
import {
  ArrowDownUp,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowUpDown,
} from "lucide-react";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import { type TransitionDirection } from "@/themes/transition-direction";

const DIRECTION_OPTIONS: {
  value: TransitionDirection;
  label: string;
  icon: typeof ArrowLeftRight;
}[] = [
  { value: "ltr", label: "左到右", icon: ArrowLeftRight },
  { value: "rtl", label: "右到左", icon: ArrowRightLeft },
  { value: "ttb", label: "上到下", icon: ArrowUpDown },
  { value: "btt", label: "下到上", icon: ArrowDownUp },
];

/**
 * 动画方向选择器：ltr / rtl / ttb / btt。
 * 切换主题色或主题模式时，ViewTransition 的 clip-path 揭示方向。
 */
export function TransitionDirectionPicker() {
  const transitionDirection = useDesignThemeStore((s) => s.transitionDirection);
  const setTransitionDirection = useDesignThemeStore(
    (s) => s.setTransitionDirection,
  );

  return (
    <RadioGroup
      value={transitionDirection}
      variant="secondary"
      onChange={(value) => setTransitionDirection(value as TransitionDirection)}
    >
      <Label>动画方向</Label>
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        {DIRECTION_OPTIONS.map(({ value, label, icon: Icon }) => (
          <Radio key={value} className="mt-2" value={value}>
            <Radio.Content
              className={cn(
                "group w-full rounded-lg border border-default px-1 py-2 transition-all",
                "data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 hover:scale-105",
              )}
            >
              <div className="min-w-0 flex items-center justify-center w-full gap-1">
                <Icon className="shrink-0" size={14} />
                <Description className="truncate">{label}</Description>
              </div>
            </Radio.Content>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
