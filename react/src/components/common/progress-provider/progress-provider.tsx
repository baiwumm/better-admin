import { ProgressProvider as BProgressProvider } from "@bprogress/react";

/**
 * 全局进度条 Provider。
 *
 * 封装 @bprogress/react，统一配置进度条样式与行为，
 * 避免在 main.tsx 中直接暴露第三方库的细节。
 *
 * 注意：delay / startPosition / stopDelay 只对「手动调用」useProgress().start/stop
 * 生效的前提，是这些值经 __root.tsx 的 bindProgress 下发给 progress.ts 状态机
 * （Provider 自身的这三个 props 仅影响锚点点击场景，本项目未启用锚点进度）。
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
