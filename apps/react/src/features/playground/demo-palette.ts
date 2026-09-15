/**
 * 演示组件的预设 accent 色板（hex）。
 * 这是演示组件的参数值而非项目 Design Token：rare-ui 组件从单一 hex 派生自身配色
 * （code-block 高亮主题 / orb 着色 / 热力图色阶），与页面 chrome 的 HeroUI token 体系无关。
 */
export const DEMO_ACCENTS = [
  "#1A73F2",
  "#F75001",
  "#22C55E",
  "#A855F7",
  "#EC4899",
  "#0EA5E9",
] as const;

export type DemoAccent = (typeof DEMO_ACCENTS)[number];
