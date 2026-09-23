import { Children, isValidElement, type ReactNode } from "react";

/**
 * 步骤列表（beUI 风格：序号圆点 + 虚线连接线）
 *
 * API 与 fumadocs-ui 的 Steps / Step 保持一致，MDX 内容零改动。
 */

export function Steps({ children }: { children: ReactNode }) {
  let index = 0;

  return (
    <div className="my-5">
      {Children.toArray(children).map((child, i) => {
        // MDX 编译后 <Step> 与这里注册的是同一组件引用，直接按 type 比较
        if (isValidElement(child) && child.type === Step) {
          const content = (child.props as { children?: ReactNode }).children;
          index += 1;
          return (
            <StepRow key={i} index={index}>
              {content}
            </StepRow>
          );
        }
        return <div key={i}>{child}</div>;
      })}
    </div>
  );
}

export function Step({ children }: { children?: ReactNode }) {
  // 独立使用（未被 Steps 包裹）时退化为普通块
  return <div>{children}</div>;
}

function StepRow({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <div className="relative flex gap-4 pb-5 last:pb-0">
      <div className="relative flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-bold shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
          {index}
        </span>
        {/* 与下一行相连的虚线；最后一项高度塌缩为 0（容器 last:pb-0 时正好对齐） */}
        <span
          aria-hidden
          className="mt-1 w-px flex-1 border-l border-dashed border-border"
        />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
