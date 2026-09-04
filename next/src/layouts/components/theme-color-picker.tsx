"use client";

import { Button, ColorSwatchPicker, parseColor } from "@heroui/react";
import { Shuffle } from "lucide-react";
import { useCallback, useEffect } from "react";

import { PickerLabel } from "./picker-label";

import { THEME_PALETTES } from "@/themes/color-palettes";
import { useTranslation } from "@/i18n";
import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 从色板 ID 列表中找到对应 hex 的色板，返回其 ID。
 */
function findPaletteIdByHex(hex: string): string {
  const found = THEME_PALETTES.find(
    (p) => p.accentHex.toLowerCase() === hex.toLowerCase(),
  );

  return found?.id ?? "default";
}

/**
 * 主题色选择器：ColorSwatchPicker 色块网格 + 随机切换按钮。
 * 切换时通过 store 的 setDesignTheme 触发 ViewTransition 动画。
 */
export function ThemeColorPicker() {
  const activePaletteId = useDesignThemeStore((s) => s.designThemeId);
  const setDesignTheme = useDesignThemeStore((s) => s.setDesignTheme);
  const { t } = useTranslation();

  // 监听跨标签页的主题色变化（StorageEvent 只在其他标签页触发）
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "better-admin-design-theme" && e.newValue) {
        setDesignTheme(e.newValue);
      }
    };

    window.addEventListener("storage", handler);

    return () => window.removeEventListener("storage", handler);
  }, [setDesignTheme]);

  // ColorSwatchPicker 的 value 需要是 parseColor(Color) 对象
  const swatchValue = parseColor(
    THEME_PALETTES.find((p) => p.id === activePaletteId)?.accentHex ??
      THEME_PALETTES[0].accentHex,
  );

  const handleColorChange = useCallback(
    (color: ReturnType<typeof parseColor>) => {
      const hex = color.toString("hex");
      const paletteId = findPaletteIdByHex(hex);

      setDesignTheme(paletteId);
    },
    [setDesignTheme],
  );

  // 随机切换主题色（排除当前激活的选项）
  const handleRandom = useCallback(() => {
    const candidates = THEME_PALETTES.filter((p) => p.id !== activePaletteId);

    if (candidates.length === 0) return;

    const random = candidates[Math.floor(Math.random() * candidates.length)];

    setDesignTheme(random.id);
  }, [activePaletteId, setDesignTheme]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <PickerLabel
          labelKey="layout.prefs.themeColor.label"
          tooltipKey="layout.prefs.themeColor.tooltip"
        />
        <Button
          isIconOnly
          aria-label={t("layout.prefs.themeColor.random")}
          className="text-muted"
          size="sm"
          variant="ghost"
          onPress={handleRandom}
        >
          <Shuffle />
        </Button>
      </div>
      <ColorSwatchPicker
        layout="grid"
        value={swatchValue}
        onChange={handleColorChange}
      >
        {THEME_PALETTES.map((palette) => (
          <ColorSwatchPicker.Item key={palette.id} color={palette.accentHex}>
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>
    </div>
  );
}
