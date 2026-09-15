/**
 * Playground 演示页元数据（四端统一，规范见 docs/plan-dashboard-playground.md §5.2）。
 *
 * 每个演示目录就近维护一份 `meta.ts`，`registry.ts` 汇总导出；
 * 页首信息卡 `PlaygroundIntro` 只消费元数据，页面本身不手写任何说明文案或链接。
 */

export type DemoPackage = {
  /** npm 包名，如 "@number-flow/vue" */
  name: string;
  /** 版本号：一律经 `packageVersion()` 从 package.json 自动读取，禁止手写 */
  version: string;
  /** 仓库地址（无法从包名推导，需手填） */
  github: string;
  /** 官方文档 / 官网（可选） */
  docs?: string;
  /** npm 地址；缺省由包名推导 https://www.npmjs.com/package/<name> */
  npm?: string;
};

export type DemoUsedIn = {
  /** i18n：项目内已使用该能力的业务页名称 */
  labelKey: string;
  /** 站内路由路径 */
  to: string;
};

export type DemoMeta = {
  /** i18n：演示标题 */
  titleKey: string;
  /** i18n：这个演示展示什么 */
  descriptionKey: string;
  /** i18n：主要用于什么业务场景 */
  scenarioKey: string;
  /** 项目内已使用该能力的业务页，可点击跳转（Phase C Dashboard 完成后回填） */
  usedIn?: DemoUsedIn[];
  /** 新增 npm 依赖；零依赖演示传空数组，信息卡显示「零新依赖」标签 */
  packages: DemoPackage[];
  /** 仓库内源码路径（相对仓库根），渲染为 GitHub 文件链接 */
  source: string;
};
