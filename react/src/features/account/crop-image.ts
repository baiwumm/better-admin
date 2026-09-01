import type { Area } from "react-easy-crop";

/**
 * 头像裁剪输出工具：以 react-easy-crop 的裁剪区域 + 旋转角
 * 在 canvas 上合成，并统一缩放输出为 256×256 WebP Blob
 * （toBlob 不支持 webp 的浏览器自动回退 PNG，后端两种类型均接受）。
 */

/** 输出尺寸（正方形，与契约「每用户一张头像」的小图定位一致） */
const OUTPUT_SIZE = 256;

function getRadianAngle(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("图片导出失败"));
        }
      },
      "image/webp",
      0.9,
    );
  });
}

export async function getCroppedWebpBlob(
  imageSrc: string,
  crop: Area,
  rotation: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  // 1. 将原图按旋转角绘制到足够容纳对角线的正方形画布（官方推荐 safeArea 算法），
  //    避免旋转后出界被裁断
  const maxSize = Math.max(image.naturalWidth, image.naturalHeight);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  const canvas = document.createElement("canvas");

  canvas.width = safeArea;
  canvas.height = safeArea;

  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas 2D 上下文不可用");

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(
    image,
    safeArea / 2 - image.naturalWidth * 0.5,
    safeArea / 2 - image.naturalHeight * 0.5,
  );

  // 2. 取出裁剪区域（croppedAreaPixels 坐标系已包含旋转）。
  //    偏移量取负号：把 safeArea 位图中 (绘制偏移 + 裁剪起点) 的像素平移到新画布 (0,0)；
  //    符号写反会截取到图片右下角的错误区域（上线前实测发现的严重 bug）
  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = Math.round(crop.width);
  canvas.height = Math.round(crop.height);
  ctx.putImageData(
    data,
    Math.round(-safeArea / 2 + image.naturalWidth * 0.5 - crop.x),
    Math.round(-safeArea / 2 + image.naturalHeight * 0.5 - crop.y),
  );

  // 3. 统一缩放输出 256×256 WebP
  const output = document.createElement("canvas");

  output.width = OUTPUT_SIZE;
  output.height = OUTPUT_SIZE;
  output.getContext("2d")?.drawImage(canvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return canvasToBlob(output);
}
