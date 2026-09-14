import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="rounded-full border border-dashed px-4 py-1 text-xs text-muted-foreground">
        404
      </p>
      <h1 className="mt-6 text-4xl font-bold tracking-tight">页面不存在</h1>
      <p className="mt-3 text-muted-foreground">
        你访问的页面可能已被移动或删除。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-80"
      >
        返回首页
      </Link>
    </div>
  );
}
