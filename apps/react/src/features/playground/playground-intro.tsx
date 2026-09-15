import type { DemoMeta, DemoPackage } from "./types";
import type { ReactNode } from "react";

import { Button, Card, Chip, Link, Tooltip, Typography } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  FileCode2,
  FolderGit2,
  Package,
} from "lucide-react";

import { npmUrl, sourceUrl } from "./constants";

import { useTranslation } from "@/i18n";

/** 信息卡内的分区：小标题 + 内容。 */
function IntroSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Typography className="font-medium" color="muted" type="body-xs">
        {label}
      </Typography>
      {children}
    </div>
  );
}

/** 依赖 Chip 内的圆形图标外链（npm / GitHub / Docs），带 Tooltip。 */
function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip delay={0}>
      <Link
        aria-label={label}
        className="grid size-6 shrink-0 place-items-center rounded-full text-muted no-underline transition-colors hover:bg-default hover:text-foreground"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </Link>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        {label}
      </Tooltip.Content>
    </Tooltip>
  );
}

/** 单个依赖包：`包名@版本` + npm / GitHub / Docs 三个图标外链。 */
function PackageChip({ pkg }: { pkg: DemoPackage }) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface py-0.5 pr-1 pl-2.5">
      <span className="mr-1 font-mono text-xs text-foreground">
        {pkg.name}
        <span className="text-muted">@{pkg.version}</span>
      </span>
      <IconLink
        href={pkg.npm ?? npmUrl(pkg.name)}
        label={t("features.playground.intro.npm")}
      >
        <Package className="size-3.5" />
      </IconLink>
      <IconLink href={pkg.github} label={t("features.playground.intro.github")}>
        <FolderGit2 className="size-3.5" />
      </IconLink>
      {pkg.docs ? (
        <IconLink href={pkg.docs} label={t("features.playground.intro.docs")}>
          <BookOpen className="size-3.5" />
        </IconLink>
      ) : null}
    </span>
  );
}

export interface PlaygroundIntroProps {
  meta: DemoMeta;
}

/**
 * 演示页页首信息卡（四端统一结构，规范见 plan-dashboard-playground.md §5.2）：
 * 标题区（标题 / 描述 / 主要场景）→ 依赖区（包 Chip 或「零新依赖」标签）
 * → 关联区（查看源码 GitHub 链接 + 项目内使用跳转）。
 * 版本号由 `packageVersion()` 从 package.json 自动读取；文案全部走 i18n。
 */
export function PlaygroundIntro({ meta }: PlaygroundIntroProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-bold">{t(meta.titleKey)}</Card.Title>
        <Card.Description className="text-xs">
          {t(meta.descriptionKey)}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <IntroSection label={t("features.playground.intro.scenario")}>
          <Typography type="body-sm">{t(meta.scenarioKey)}</Typography>
        </IntroSection>
        <IntroSection label={t("features.playground.intro.dependencies")}>
          <div className="flex flex-wrap items-center gap-2">
            {meta.packages.length === 0 ? (
              <Chip color="success" size="sm" variant="soft">
                {t("features.playground.intro.zeroDependency")}
              </Chip>
            ) : (
              meta.packages.map((pkg) => (
                <PackageChip key={pkg.name} pkg={pkg} />
              ))
            )}
          </div>
        </IntroSection>
      </Card.Content>
      <Card.Footer className="flex flex-wrap items-center gap-2 border-t border-separator pt-4">
        <Link
          className="inline-flex items-center gap-1.5 text-sm no-underline"
          href={sourceUrl(meta.source)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <FileCode2 className="size-4" />
          {t("features.playground.intro.viewSource")}
          <Link.Icon className="pb-0" />
        </Link>
        {meta.usedIn?.length ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Typography color="muted" type="body-xs">
              {t("features.playground.intro.usedIn")}
            </Typography>
            {meta.usedIn.map((item) => (
              <Button
                key={item.to}
                size="sm"
                variant="secondary"
                onPress={() => void navigate({ to: item.to })}
              >
                {t(item.labelKey)}
                <ArrowUpRight className="size-3.5" />
              </Button>
            ))}
          </div>
        ) : null}
      </Card.Footer>
    </Card>
  );
}
