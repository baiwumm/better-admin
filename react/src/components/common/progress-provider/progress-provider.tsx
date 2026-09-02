import { ProgressProvider as BProgressProvider } from "@bprogress/react";

/**
 * 全局进度条 Provider。
 *
 * 封装 @bprogress/react，统一配置进度条样式与行为，
 * 避免在 main.tsx 中直接暴露第三方库的细节。
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <BProgressProvider
      disableSameURL
      shallowRouting
      color="var(--accent)"
      delay={200}
      height="2px"
      startPosition={0.3}
      stopDelay={0}
    >
      {children}
    </BProgressProvider>
  );
}
