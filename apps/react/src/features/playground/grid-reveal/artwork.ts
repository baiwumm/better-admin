/** 确定性伪随机（mulberry32）：同 seed 产出完全一致的演示图，重复播放可复现。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 本地生成一张「AI 出图」风格的渐变 + 光斑作品（canvas → data URL）：
 * 不依赖任何外链图片，离线可用；data URL 同源，GridReveal 可直接读取像素取均值。
 */
export function generateArtworkDataUrl(seed: number, size = 768): string {
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  const rand = mulberry32(seed);
  const hueA = Math.floor(rand() * 360);
  const hueB = (hueA + 40 + Math.floor(rand() * 140)) % 360;

  const gradient = ctx.createLinearGradient(0, 0, size, size);

  gradient.addColorStop(0, `hsl(${hueA} 72% 58%)`);
  gradient.addColorStop(1, `hsl(${hueB} 68% 42%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // 大光斑：径向渐变圆，模拟生成图的高光与景深
  const blobs = 6 + Math.floor(rand() * 4);

  for (let i = 0; i < blobs; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const radius = size * (0.08 + rand() * 0.22);
    const hue = (hueA + rand() * (hueB - hueA + 360)) % 360;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);

    glow.addColorStop(
      0,
      `hsl(${hue} 85% ${65 + rand() * 20}% / ${0.5 + rand() * 0.3})`,
    );
    glow.addColorStop(1, `hsl(${hue} 85% 60% / 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 细颗粒噪点：给网格取色提供细节，让拆分顺序更自然
  const speckles = 900;

  for (let i = 0; i < speckles; i++) {
    const x = rand() * size;
    const y = rand() * size;

    ctx.fillStyle = `hsl(0 0% ${rand() > 0.5 ? 100 : 0}% / ${rand() * 0.12})`;
    ctx.fillRect(x, y, 2, 2);
  }

  return canvas.toDataURL("image/png");
}
