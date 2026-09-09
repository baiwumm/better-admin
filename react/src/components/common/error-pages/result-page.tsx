import type { ReactNode } from "react";

import { Button, Typography } from "@heroui/react";
import { Link, useRouter } from "@tanstack/react-router";

import { useTranslation } from "@/i18n";

type ResultPageProps = {
  /** Result 插画（纯装饰 SVG，语义由 title / subTitle 表达） */
  image: ReactNode;
  title: string;
  subTitle: string;
  /** 操作区；缺省为「返回上一页 + 返回首页」双按钮 */
  extra?: ReactNode;
};

/**
 * Result 风格错误页：对齐 Ant Design Result 的信息结构与排版
 * （插画 250px → 标题 24px/600 → 副标题 14px 次要色 → 操作区，
 * 整页居中、垂直水平双向），插画来源见各 illustration-*.tsx 文件头。
 */
export function ResultPage({ image, title, subTitle, extra }: ResultPageProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      {/* 插画：固定 250px 展示宽，小屏随容器收缩（svg 原始尺寸约 252×294） */}
      <div className="mx-auto w-62.5 max-w-full [&_svg]:h-auto [&_svg]:w-full">
        {image}
      </div>
      <Typography className="mt-6 text-2xl font-semibold" type="h1">
        {title}
      </Typography>
      <Typography className="mt-2 leading-normal" color="muted" type="body-sm">
        {subTitle}
      </Typography>
      <div className="mt-8 flex items-center justify-center gap-3">
        {extra ?? (
          <>
            <Button variant="outline" onPress={() => router.history.back()}>
              {t("common.goBack")}
            </Button>
            <Link to="/">
              <Button variant="primary">{t("common.backHome")}</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
