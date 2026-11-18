import { PromoVideo } from "@/components/landing/promo-video";
import { SectionHeader } from "@/components/landing/section-header";

/** 宣传片段：真实的 54 秒产品录屏，独立成节，不再挤在 Hero 里。 */
export function Demo() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="02 / 演示"
          sub="五个应用共用同一套页面与交互；以下为真实组件渲染的录屏，非截图拼贴。"
          title="先看一遍后台长什么样"
        />
        <PromoVideo />
      </div>
    </section>
  );
}
