import type { DemoMeta } from "./types";

import { animatedCounterMeta } from "./animated-counter/meta";
import { codeBlockMeta } from "./code-block/meta";
import { fluidOrbMeta } from "./fluid-orb/meta";
import { githubActivityMeta } from "./github-activity/meta";
import { gridRevealMeta } from "./grid-reveal/meta";
import { loadersMeta } from "./loaders/meta";
import { matrixOrbMeta } from "./matrix-orb/meta";
import { numberFlowMeta } from "./number-flow/meta";
import { okrTreeMeta } from "./okr-tree/meta";
import { themeSwitchAnimationMeta } from "./theme-switch-animation/meta";

export type PlaygroundDemo = {
  /** 目录名（与 `features/playground/<id>/` 一致） */
  id: string;
  /** 站内路由路径（与菜单 `to` 一致） */
  to: string;
  meta: DemoMeta;
};

/**
 * 全部演示页元数据汇总（顺序与菜单树一致），供未来索引页 / 命令面板等复用。
 * 新增演示页：建目录 + `meta.ts` 后在此登记一行。
 */
export const PLAYGROUND_DEMOS: readonly PlaygroundDemo[] = [
  { id: "code-block", to: "/playground/code-block", meta: codeBlockMeta },
  {
    id: "number-flow",
    to: "/playground/count-to/number-flow",
    meta: numberFlowMeta,
  },
  {
    id: "animated-counter",
    to: "/playground/count-to/animated-counter",
    meta: animatedCounterMeta,
  },
  { id: "fluid-orb", to: "/playground/ai-kit/fluid-orb", meta: fluidOrbMeta },
  {
    id: "grid-reveal",
    to: "/playground/ai-kit/grid-reveal",
    meta: gridRevealMeta,
  },
  {
    id: "matrix-orb",
    to: "/playground/ai-kit/matrix-orb",
    meta: matrixOrbMeta,
  },
  {
    id: "github-activity",
    to: "/playground/github-activity",
    meta: githubActivityMeta,
  },
  {
    id: "theme-switch-animation",
    to: "/playground/theme-switch-animation",
    meta: themeSwitchAnimationMeta,
  },
  { id: "loaders", to: "/playground/loaders", meta: loadersMeta },
  { id: "okr-tree", to: "/playground/okr-tree", meta: okrTreeMeta },
];
