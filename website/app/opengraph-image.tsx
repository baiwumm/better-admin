import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/** 黑白虚线风格的站点 OG 图（英文文案，避免运行时中文字体依赖） */
export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 28px",
          border: "1px dashed #d4d4d4",
          borderRadius: 999,
          fontSize: 22,
          color: "#737373",
        }}
      >
        React · Vue · Next.js · Nuxt · NestJS
      </div>
      <div
        style={{
          marginTop: 36,
          fontSize: 88,
          fontWeight: 700,
          display: "flex",
        }}
      >
        Better Admin
      </div>
      <div
        style={{
          marginTop: 20,
          fontSize: 30,
          color: "#525252",
          display: "flex",
        }}
      >
        One product · Five stacks · Same documentation
      </div>
      <div
        style={{
          marginTop: 52,
          padding: "12px 34px",
          backgroundColor: "#171717",
          color: "#fafafa",
          fontSize: 24,
          fontWeight: 700,
          borderRadius: 999,
          display: "flex",
        }}
      >
        docs.baiwumm.com
      </div>
    </div>,
    size,
  );
}
