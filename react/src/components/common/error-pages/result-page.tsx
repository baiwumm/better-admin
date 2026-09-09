import type { ReactNode } from "react";

import { Button, Typography, cn } from "@heroui/react";
import { Link, useRouter } from "@tanstack/react-router";

import { useTranslation } from "@/i18n";

type ResultPageProps = {
  /** Result 插画（纯装饰 SVG，语义由 title / subTitle 表达） */
  image: ReactNode;
  title: string;
  subTitle: string;
  /** 操作区；缺省为「返回上一页 + 返回首页」双按钮 */
  extra?: ReactNode;
  /**
   * 渲染形态：fullscreen 占满视口（错误跳转的独立页，默认）；
   * embedded 撑满父容器高度（/exception/* 菜单页渲染于主体区，
   * 配合 FULL_WIDTH_ROUTES 去 padding 实现「贴边撑满、无滚动条」）
   */
  variant?: "fullscreen" | "embedded";
};

/**
 * Result 风格错误页：对齐 Ant Design Result 的信息结构与排版
 * （插画 250px → 标题 24px/600 → 副标题 14px 次要色 → 操作区，
 * 整页居中、垂直水平双向），插画来源见各 illustration-*.tsx 文件头。
 */
export function ResultPage({
  image,
  title,
  subTitle,
  extra,
  variant = "fullscreen",
}: ResultPageProps) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center bg-background px-6 text-center text-foreground",
        variant === "embedded" ? "h-full" : "h-dvh",
      )}
    >
      {/* 插画：固定 250px 展示宽，小屏随容器收缩；embedded 下再限高（不超过
          视口一半），避免小窗口内容超过容器高度时重新出现滚动条 */}
      <div
        className={cn(
          "mx-auto w-62.5 max-w-full [&_svg]:h-auto [&_svg]:w-full",
          variant === "embedded" && "min-h-0 [&_svg]:max-h-[45vh]",
        )}
      >
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
