import { ButtonLink } from "@/components/motion/button/base";
import { TiltCard } from "@/components/motion/tilt-card";

export function Cta() {
  return (
    <section className="px-6 py-24">
      {/* panel-premium 无 hover transform，可直接作内层；大卡面倾角收到 3 度，
          与下方小卡片的 6 度在视觉摆幅上对齐。
          ⚠️ max-w-5xl / mx-auto 必须挂在 TiltCard 上：glare inset-0 铺的是 wrapper，
          若内层才限宽，光斑会延伸到卡片左右两侧的空白区 */}
      <TiltCard max={3} className="mx-auto max-w-5xl rounded-[1.5rem]">
        <div className="panel-premium px-10 py-16 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            准备好深入了吗？
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-muted-foreground">
            从概览开始，了解 Better Admin
            的架构约定、数据库设计与多技术栈实现细节。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/docs/start/quick-start">
              从快速开始读起
            </ButtonLink>
            <ButtonLink href="/docs/architecture/database" variant="secondary">
              看数据库设计
            </ButtonLink>
          </div>
        </div>
      </TiltCard>
    </section>
  );
}
