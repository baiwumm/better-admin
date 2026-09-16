import LightRays from "@/components/background/light-ray";
import { Footer } from "@/components/landing/footer";
import { Cta } from "@/components/landing/cta";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Stacks } from "@/components/landing/stacks";

export default function HomePage() {
  return (
    <div className="relative isolate overflow-hidden">
      {/*
        背景光效：固定视口、z-0，压在 main(z-10) 之下。
        调参说明：这片光在白色底上会同时带来"光束"和"灰纱"两种观感，
        片元着色器还会把 alpha 与 rgb 独立缩放，铺满后整页像蒙了层纱。
        因此这里刻意收着用——`opacity` 降低整体强度、`rayLength` 收窄影响范围，
        只留首屏顶部那束光，别再往页面下半部渗。
      */}
      <LightRays
        className="fixed inset-0 z-0 opacity-65"
        raysOrigin="top-center"
        rayLength={1.5}
        followMouse
      />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <div className="mx-auto max-w-5xl border-b border-dashed" />
        <Features />
        <div className="mx-auto max-w-5xl border-b border-dashed" />
        <Stacks />
        <div className="mx-auto max-w-5xl border-b border-dashed" />
        <Cta />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
