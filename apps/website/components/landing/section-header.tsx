import { Typography } from "@heroui/react";

/**
 * 共享小节头：编号眉标（朱红）+ 标题 + 可选副题。
 * 小节之间的 hairline 由各 section 的 border-t 提供，本组件只管文字层级。
 */
export function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Typography className="eyebrow" type="body-xs" weight="semibold">
        {eyebrow}
      </Typography>
      <Typography
        className="text-balance tracking-tight"
        type="h2"
        weight="semibold"
      >
        {title}
      </Typography>
      {sub ? (
        <Typography
          className="max-w-2xl text-pretty leading-relaxed"
          color="muted"
          type="body-sm"
        >
          {sub}
        </Typography>
      ) : null}
    </div>
  );
}
