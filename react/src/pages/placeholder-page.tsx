import { Construction } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

/**
 * 业务占位页面模板：统一居中占位内容，用于尚未迁移的业务模块。
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-secondary text-muted">
        <Construction className="size-7" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted">
        {description ?? "该模块正在开发中（UI 基准迁移渐进式推进），敬请期待。"}
      </p>
    </div>
  );
}
