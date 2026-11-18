"use client";

import { Button, Typography } from "@heroui/react";
import { useRouter } from "next/navigation";

export function Cta() {
  const router = useRouter();

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <Typography className="eyebrow" type="body-xs" weight="semibold">
          05 / 继续
        </Typography>
        <Typography
          className="mt-4 max-w-3xl text-balance leading-snug tracking-tight"
          type="h2"
          weight="semibold"
        >
          想看清同一份需求在五种技术栈里怎么落地？
        </Typography>
        <Typography
          className="mt-4 max-w-2xl leading-relaxed"
          color="muted"
          type="body-sm"
        >
          从项目概览开始，依次读架构约定、数据库设计、UI 规范与各端实现要点。
        </Typography>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onPress={() => router.push("/docs/start/quick-start/")}
          >
            从快速开始读起
          </Button>
          <Button
            size="lg"
            variant="outline"
            onPress={() => router.push("/docs/architecture/database/")}
          >
            看数据库设计
          </Button>
        </div>
      </div>
    </section>
  );
}
