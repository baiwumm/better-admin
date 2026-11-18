import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow">404 / Not Found</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
        页面不存在
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        你访问的页面可能已被移动或删除。
      </p>
      <Link
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        href="/"
      >
        返回首页
      </Link>
    </div>
  );
}
