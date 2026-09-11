/**
 * 头像裁剪输出工具：vue-advanced-cropper 的 getResult().canvas 已完成
 * 裁剪 + 旋转合成（原图像素尺寸），此处统一缩放输出为 256×256 WebP Blob
 * （toBlob 不支持 webp 的浏览器自动回退 PNG，后端两种类型均接受）。
 * React 端因 react-easy-crop 只给区域坐标，需自行在 canvas 上做旋转 / 裁剪数学；
 * Vue 端裁剪库直接产出 canvas，本文件只保留缩放与导出两步。
 */

/** 输出尺寸（正方形，与契约「每用户一张头像」的小图定位一致） */
const OUTPUT_SIZE = 256;

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

export async function toAvatarWebpBlob(
  cropped: HTMLCanvasElement,
): Promise<Blob> {
  const output = document.createElement("canvas");

  output.width = OUTPUT_SIZE;
  output.height = OUTPUT_SIZE;

  const ctx = output.getContext("2d");

  if (!ctx) throw new Error("Canvas 2D 上下文不可用");

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cropped, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return canvasToBlob(output);
}
