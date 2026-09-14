"use client";

/** 全局错误兜底（根 layout 自身失败时渲染；样式可能不可用，仅保命文本）。 */
export default function GlobalError({
  error: _error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            500 · 服务出错了
          </h1>
          <p style={{ marginBottom: "1rem" }}>
            Something went wrong. / 服务器开小差了，请稍后重试。
          </p>
          <button
            style={{
              padding: "0.5rem 1.25rem",
              cursor: "pointer",
              borderRadius: "0.5rem",
            }}
            onClick={() => _reset()}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
