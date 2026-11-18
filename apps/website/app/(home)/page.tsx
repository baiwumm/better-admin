import { Cta } from "@/components/landing/cta";
import { Demo } from "@/components/landing/demo";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { QuickStart } from "@/components/landing/quick-start";
import { Stacks } from "@/components/landing/stacks";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQ_ITEMS } from "@/lib/faq";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.title,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.content,
    },
  })),
};

/**
 * 首页（2026-11-18 重构）：编辑器式单页叙事，全部段落以 hairline 分隔。
 * 导航 → Hero（规格表 + 数据行）→ 快速开始 → 演示 → 五端 → 约定 → CTA → FAQ → 页脚。
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={FAQ_JSON_LD} />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <QuickStart />
        <Demo />
        <Stacks />
        <Features />
        <Cta />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
