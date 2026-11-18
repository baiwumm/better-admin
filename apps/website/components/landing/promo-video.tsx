"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/video/better-admin-promo-16x9-54s.mp4";
const POSTER = "/video/cover.jpg";

/**
 * 首页主视觉：54 秒产品宣传片（真实组件渲染，非截图拼贴）。
 *
 * 两处刻意的设计：
 * 1. 进视野前不挂 video —— 17MB 的 mp4 不参与首屏加载，poster 先占位；
 * 2. 不做自动播放 —— 只有用户点击原生播放键才真正下载视频，避免移动端
 *    一滚动就消耗十几 MB 流量；点击播放本身也满足 prefers-reduced-motion。
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

  return (
    <div ref={wrapRef} className="mx-auto mt-10 max-w-5xl">
      <div>
        <div className="frame text-left">
          <div className="relative aspect-video bg-black">
            {armed ? (
              // 宣传片没有对白，只有画面与文字演示；原生 controls 已提供播控
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                controls
                loop
                playsInline
                aria-label="Better Admin 产品宣传片"
                className="absolute inset-0 size-full"
                controlsList="nodownload noplaybackrate"
                poster={POSTER}
                preload="none"
                src={SRC}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Better Admin 产品宣传片封面"
                className="absolute inset-0 size-full object-cover"
                decoding="async"
                loading="lazy"
                src={POSTER}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
