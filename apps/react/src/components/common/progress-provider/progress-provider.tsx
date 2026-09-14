import { ProgressProvider as BProgressProvider } from "@bprogress/react";

/**
 * 全局进度条 Provider。
 *
 * 封装 @bprogress/react，统一配置进度条样式与行为，
 * 避免在 main.tsx 中直接暴露第三方库的细节。
 *
 * 注意：手动 start / stop 的时序（startPosition=0.3 / delay=200 / stopDelay=0）
 * 以 progress.ts 状态机内常量为准（与下方 props 取值一致）；Provider 自身的
 * 这三个 props 仅影响锚点点击场景，本项目未启用锚点进度。
 * delay=200 的意义：短导航 / 快速接口全程不闪进度条。
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
