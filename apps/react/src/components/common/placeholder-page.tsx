import { Typography } from "@heroui/react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { useTranslation } from "@/i18n";

type PlaceholderPageProps = {
  /** lucide kebab-case 图标名（与菜单 icon 同口径） */
  icon?: IconName;
  /** 页面标题 i18n 键 */
  titleKey: string;
  /** 可选描述 i18n 键 */
  descriptionKey?: string;
};

/**
 * 占位页：图标 + 标题 + 可选描述（与 Vue 端 components/PlaceholderPage.vue 同构），
 * 供尚未实现的页面统一占位；文案全部走 i18n 键。
 */
export function PlaceholderPage({
  icon = "package-open",
  titleKey,
  descriptionKey,
}: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <DynamicIcon aria-hidden className="size-12 text-muted" name={icon} />
      <Typography className="text-2xl font-bold tracking-tight" type="h1">
        {t(titleKey)}
      </Typography>
      {descriptionKey ? (
        <Typography className="max-w-md" color="muted" type="body-sm">
          {t(descriptionKey)}
        </Typography>
      ) : null}
    </div>
  );
}
