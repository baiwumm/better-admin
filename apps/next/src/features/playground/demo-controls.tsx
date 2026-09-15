"use client";

import type { ReactNode } from "react";

import {
  ColorSwatchPicker,
  Label,
  Slider,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";

/**
 * 带文字标签的开关。
 * `Switch.Content` 才是可点击的 SwitchButton（HeroUI 实现注释：wrapping the control + Label），
 * Control 必须放在 Content 内才能整体点击，且二者同行排布（根 `.switch` 是 flex-col）。
 */
export function DemoSwitch({
  label,
  isSelected,
  onChange,
}: {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className="text-sm">{label}</Label>
      </Switch.Content>
    </Switch>
  );
}

/** 分段单选（ToggleButtonGroup single + 不允许空选），泛型收敛选项 id。 */
export function DemoSegmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleButtonGroup
      disallowEmptySelection
      aria-label={label}
      selectedKeys={[value]}
      size="sm"
      onSelectionChange={(keys) => {
        const [key] = keys;

        if (key !== undefined) onChange(String(key) as T);
      }}
    >
      {options.map((option, index) => (
        <ToggleButton key={option.id} id={option.id}>
          {index > 0 ? <ToggleButtonGroup.Separator /> : null}
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** 颜色色板单选：HeroUI 内置 ColorSwatchPicker，选中值以 hex 字符串回传。 */
export function DemoColorSwatchPicker({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <ColorSwatchPicker
      aria-label={label}
      size="sm"
      value={value}
      onChange={(color) => onChange(color.toString("hex"))}
    >
      {colors.map((color) => (
        <ColorSwatchPicker.Item key={color} color={color}>
          <ColorSwatchPicker.Swatch />
          <ColorSwatchPicker.Indicator />
        </ColorSwatchPicker.Item>
      ))}
    </ColorSwatchPicker>
  );
}

/** 带输出值的紧凑滑块（单值）。 */
export function DemoSlider({
  label,
  value,
  minValue,
  maxValue,
  step = 1,
  formatOptions,
  onChange,
  className,
}: {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <Slider
      aria-label={label}
      className={className ?? "w-48"}
      formatOptions={formatOptions}
      maxValue={maxValue}
      minValue={minValue}
      step={step}
      value={value}
      onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
    >
      <Slider.Output />
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}
