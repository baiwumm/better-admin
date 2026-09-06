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
      <LightRays
        className="fixed inset-0 z-0"
        raysOrigin="top-center"
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
