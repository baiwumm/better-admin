"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/video/better-admin-promo-16x9-54s.mp4";
const POSTER = "/video/cover.jpg";

/**
 * 首页主视觉：54 秒产品宣传片（真实组件渲染，非截图拼贴）。
 *
 * 两处刻意的设计：
 * 1. 进视野前不挂 src —— 17MB 的 mp4 不参与首屏加载，poster 先占位，LCP 仍是本地图片；
 * 2. 尊重 prefers-reduced-motion：降级为静态封面，不自动播。
 * 播控交给浏览器原生 controls（含音量/进度/全屏），不另做一套按钮。
 */
export function PromoVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div ref={wrapRef} className="mx-auto mt-20 max-w-4xl">
      <div className="animate-fade-up-delay-4">
        <div className="window-premium overflow-hidden rounded-2xl text-left">
          <div className="relative aspect-video bg-black">
            {armed ? (
              <video
                className="absolute inset-0 size-full"
                src={SRC}
                poster={POSTER}
                muted
                loop
                playsInline
                controls
                autoPlay={!reduceMotion}
                preload="none"
                controlsList="nodownload noplaybackrate"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={POSTER}
                alt="Better Admin 产品宣传片封面"
                className="absolute inset-0 size-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
