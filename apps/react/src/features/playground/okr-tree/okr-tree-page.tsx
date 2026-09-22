import type { ReactNode } from "react";
import type {
  FilterNodeMethod,
  NodeScope,
  TreeDirection,
  ViewportToolbarScope,
} from "react-okr-tree";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clampZoom,
  OkrTree,
  OkrTreeViewport,
  type OkrTreeHandle,
  type TreeNode,
  type ViewportOffset,
} from "react-okr-tree";
import "react-okr-tree/style.css";
import {
  Building2,
  Maximize2,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button, InputGroup, cn } from "@heroui/react";

import { DemoControl, DemoSection, PlaygroundPage } from "../demo-section";
import { DemoSegmented, DemoSwitch } from "../demo-controls";

import { okrTreeMeta } from "./meta";
import {
  createOkrInitiativeData,
  createOkrObjectiveData,
  createOrgData,
  type OrgNodeData,
  type OkrNodeData,
} from "./okr-tree-data";

import { useTranslation } from "@/i18n";

import "./okr-tree.css";

/** fitToScreen 四周留白（px） */
const FIT_PADDING = 24;
/** 缩放下限：全展开约 12 个叶子，过小缩放文本发虚，超出部分交拖拽平移 */
const MIN_ZOOM = 0.55;

/** 画布容器：底色与外圆角；宽度变化由 useViewportAutoFit 监听重算。 */
function TreeCanvas({
  containerRef,
  onRefit,
  children,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 双击画布（工具栏除外）时执行的重新适配。 */
  onRefit?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={containerRef}
      className="okr-tree-demo rounded-2xl bg-default/30 p-4"
      onDoubleClickCapture={(event) => {
        // 包把双击视口绑成回原点(0,0)的 reset——画布模式下视图会跳到左上角。
        // 捕获阶段拦下（含树外空白区域，包根元素不透传事件 props），改走页面 fit。
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest(".okr-viewport-toolbar")
        )
          return;
        event.stopPropagation();
        onRefit?.();
      }}
    >
      {children}
    </div>
  );
}

/**
 * 画布工具栏（renderToolbar 自绘，替换包默认中文按钮）：缩放 / 百分比 / 适应 / 重置。
 * 重置不接 scope.reset——包的 reset 是回到原点(0,0)（画布模式即左上角），
 * 本页初始态是 useViewportAutoFit 的居中适配，重置即重新执行 fit。
 */
function ViewportToolbar({
  onReset,
  scope,
}: {
  onReset: () => void;
  scope: ViewportToolbarScope;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border bg-surface/90 px-1.5 py-0.5 shadow-sm backdrop-blur">
      <Button
        isIconOnly
        aria-label={t("features.playground.okrTree.zoomOut")}
        size="sm"
        variant="outline"
        onPress={scope.zoomOut}
      >
        <ZoomOut aria-hidden className="size-3.5" />
      </Button>
      <span className="text-muted w-10 text-center text-xs tabular-nums">
        {Math.round(scope.zoom * 100)}%
      </span>
      <Button
        isIconOnly
        aria-label={t("features.playground.okrTree.zoomIn")}
        size="sm"
        variant="outline"
        onPress={scope.zoomIn}
      >
        <ZoomIn aria-hidden className="size-3.5" />
      </Button>
      <Button
        isIconOnly
        aria-label={t("features.playground.okrTree.viewFit")}
        size="sm"
        variant="outline"
        onPress={() => scope.fit()}
      >
        <Maximize2 aria-hidden className="size-3.5" />
      </Button>
      <Button
        isIconOnly
        aria-label={t("features.playground.okrTree.viewReset")}
        size="sm"
        variant="outline"
        onPress={onReset}
      >
        <RotateCcw aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * 画布自动适配（受控 zoom / offset）：挂载 / deps 变化（如 direction 切换重挂载）/
 * 视口尺寸变化（侧边栏折叠、窗口缩放）时重算；展开收起、过滤等交互后也可由
 * 调用方手动调 fit（双 rAF 等 DOM 提交 + 布局稳定）。
 * 与包 fitToScreen 的差别：**缩放上限钳到 1**——内容小于视口时保持 100% 完整
 * 居中（用户要求默认不放大），仅内容超出时才缩小（不低于 MIN_ZOOM）。
 * **内容尺寸变化（单节点 +/- 展开收起）不触发 fit**——避免视图被重算"跳回
 * 居中"；全局操作（全部展开 / 收起 / 过滤）由调用方显式 fit。
 * 浏览器交互（走包内部逻辑）：拖拽平移、Ctrl/⌘ + 滚轮缩放；双击的包内置
 * 重置（回原点，画布模式即左上角）由 TreeCanvas 捕获阶段拦截，改走本页 fit。
 */
function useViewportAutoFit(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: readonly unknown[],
) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<ViewportOffset>({ x: 0, y: 0 });

  const fit = useCallback(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const viewport =
          containerRef.current?.querySelector<HTMLElement>(".okr-viewport");
        const content = containerRef.current?.querySelector<HTMLElement>(
          ".okr-viewport-content",
        );

        if (!viewport || !content) return;
        const width = Math.max(1, content.offsetWidth);
        const height = Math.max(1, content.offsetHeight);
        const availWidth = Math.max(1, viewport.clientWidth - FIT_PADDING * 2);
        const availHeight = Math.max(
          1,
          viewport.clientHeight - FIT_PADDING * 2,
        );
        const nextZoom = clampZoom(
          Math.min(availWidth / width, availHeight / height),
          MIN_ZOOM,
          1,
        );

        // translate 取整：亚像素定位会让文本发虚
        setZoom(nextZoom);
        setOffset({
          x: Math.round((viewport.clientWidth - width * nextZoom) / 2),
          y: Math.round((viewport.clientHeight - height * nextZoom) / 2),
        });
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [containerRef]);

  useLayoutEffect(() => fit(), [fit, ...deps]);

  useEffect(() => {
    const viewport =
      containerRef.current?.querySelector<HTMLElement>(".okr-viewport");

    if (!viewport) return;
    // 只观察视口宽高（侧边栏折叠 / 窗口缩放）；内容尺寸变化不观察，理由见头部注释
    const observer = new ResizeObserver(() => fit());

    observer.observe(viewport);

    return () => observer.disconnect();
  }, [containerRef, fit]);

  return { zoom, offset, setZoom, setOffset, fit };
}

/** 组织架构节点卡片（unstyled 模式下的自有外观，随站点 token 明暗切换）。 */
function OrgNodeCard({ node, data }: { node: TreeNode; data: OrgNodeData }) {
  const isRoot = node.level === 1;

  return (
    <div
      className={cn(
        "flex w-44 flex-col gap-1 rounded-xl border bg-surface p-3 text-left shadow-sm transition-colors",
        node.isCurrent ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-center gap-1.5">
        {isRoot ? (
          <Building2 aria-hidden className="size-3.5 shrink-0 text-accent" />
        ) : null}
        <span className="truncate text-sm font-medium text-foreground">
          {data.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">{data.leader}</span>
        <span className="shrink-0 tabular-nums">{data.count}</span>
      </div>
    </div>
  );
}

/** OKR 节点卡片：根 = 目标 O，右树二级 = KR，左树 = 关键举措（弱化外观）。 */
function OkrNodeCard({ node, data }: { node: TreeNode; data: OkrNodeData }) {
  const isLeft = node.isLeftChild;
  const isRoot = !isLeft && node.level === 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border bg-surface p-3 text-left shadow-sm",
        isLeft
          ? "w-40 border-dashed bg-default/40"
          : isRoot
            ? "w-60 border-accent"
            : "w-52 border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "truncate",
            isRoot
              ? "text-sm font-semibold text-foreground"
              : "text-xs font-medium text-foreground",
          )}
        >
          {data.label}
        </span>
        {data.meta ? (
          <span className="shrink-0 text-xs text-muted">{data.meta}</span>
        ) : null}
      </div>
      {typeof data.progress === "number" ? (
        <div className="h-1 overflow-hidden rounded-full bg-default">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** 区块一：组织架构树（方向切换 / 展开控制 / 过滤 / 选中态，画布自动适配）。 */
function OrgTreeSection() {
  const { t } = useTranslation();
  const treeRef = useRef<OkrTreeHandle>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<TreeDirection>("vertical");
  const [showNodeNum, setShowNodeNum] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);

  const orgData = useMemo(createOrgData, []);
  // 作用域 data 为包内宽类型 Record<string, any>，此处收敛为本页节点类型
  const renderOrgNode = useCallback(
    ({ node, data }: NodeScope) => (
      <OrgNodeCard data={data as OrgNodeData} node={node} />
    ),
    [],
  );

  /** 名称 / 负责人包含关键字即命中；空值恢复全部（包约定空值也会调用 filter）。 */
  const filterNodeMethod: FilterNodeMethod = useCallback((value, data) => {
    if (!value) return true;
    const node = data as OrgNodeData;
    const text = String(value);

    return node.label.includes(text) || node.leader.includes(text);
  }, []);

  const { zoom, offset, setZoom, setOffset, fit } = useViewportAutoFit(
    canvasRef,
    [direction],
  );

  // 输入即过滤；命中节点的祖先由组件自动保持可见；过滤后可见宽度变化，重新适配
  useEffect(() => {
    treeRef.current?.filter(keyword);
    fit();
  }, [keyword, fit]);

  function handleExpandAll() {
    treeRef.current?.expandAll();
    fit();
  }

  function handleCollapseAll() {
    treeRef.current?.collapseAll();
    fit();
  }

  function onOrgNodeClick(data: OrgNodeData) {
    setCurrentLabel(data.label);
  }

  return (
    <DemoSection
      controls={
        <>
          <DemoControl label={t("features.playground.okrTree.direction")}>
            <DemoSegmented<TreeDirection>
              label={t("features.playground.okrTree.direction")}
              options={[
                {
                  id: "horizontal",
                  label: t("features.playground.okrTree.direction.horizontal"),
                },
                {
                  id: "vertical",
                  label: t("features.playground.okrTree.direction.vertical"),
                },
              ]}
              value={direction}
              onChange={setDirection}
            />
          </DemoControl>
          <DemoControl label={t("features.playground.okrTree.expand")}>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onPress={handleExpandAll}>
                {t("features.playground.okrTree.expandAll")}
              </Button>
              <Button size="sm" variant="outline" onPress={handleCollapseAll}>
                {t("features.playground.okrTree.collapseAll")}
              </Button>
            </div>
          </DemoControl>
          <DemoControl label={t("features.playground.okrTree.search")}>
            <InputGroup className="w-52" variant="secondary">
              <InputGroup.Prefix className="text-muted">
                <Search aria-hidden className="size-3.5" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder={t("features.playground.okrTree.searchPlaceholder")}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </InputGroup>
          </DemoControl>
          <DemoSwitch
            isSelected={showNodeNum}
            label={t("features.playground.okrTree.showNodeNum")}
            onChange={setShowNodeNum}
          />
        </>
      }
      description={t("features.playground.okrTree.orgDescription")}
      title={t("features.playground.okrTree.orgTitle")}
    >
      <TreeCanvas containerRef={canvasRef} onRefit={fit}>
        {/*
         * direction 是创建期快照 prop，运行时切换按包约定绑定 key 重挂载
         *（回到 default-expanded-keys 的初始展开态，属预期行为）。
         * OkrTreeViewport：float 兄弟节点在定宽容器会换行"掉下去"，画布模式
         *（canvas absolute + 内容 max-content）从根上避免换行；受控 zoom/offset
         * 由 useViewportAutoFit 计算——内容宽高小于视口时保持 100% 居中（不放大），
         * 超出时缩放到 MIN_ZOOM 可读下限为止，剩余部分交拖拽平移。
         */}
        <OkrTreeViewport
          className="h-[480px]"
          maxZoom={2}
          minZoom={MIN_ZOOM}
          offset={offset}
          renderToolbar={(scope) => (
            <ViewportToolbar scope={scope} onReset={fit} />
          )}
          zoom={zoom}
          onOffsetChange={setOffset}
          onZoomChange={setZoom}
        >
          <OkrTree<OrgNodeData>
            key={direction}
            ref={treeRef}
            showCollapsable
            unstyled
            data={orgData}
            defaultExpandedKeys={orgData.map((node) => node.id)}
            direction={direction}
            empty={
              <span className="text-xs text-muted">
                {t("features.playground.okrTree.empty")}
              </span>
            }
            filterNodeMethod={filterNodeMethod}
            nodeKey="id"
            renderNode={renderOrgNode}
            showNodeNum={showNodeNum}
            onNodeClick={onOrgNodeClick}
          />
        </OkrTreeViewport>
      </TreeCanvas>
      <p className="text-xs text-muted">
        {currentLabel
          ? t("features.playground.okrTree.currentNode", {
              label: currentLabel,
            })
          : t("features.playground.okrTree.currentNodeEmpty")}
      </p>
    </DemoSection>
  );
}

/** 区块二：OKR 双向展开（onlyBothTree，左举措 / 右关键结果）。 */
function OkrModeSection() {
  const { t } = useTranslation();

  const objectiveData = useMemo(createOkrObjectiveData, []);
  const initiativeData = useMemo(createOkrInitiativeData, []);
  // 作用域 data 为包内宽类型 Record<string, any>，此处收敛为本页节点类型
  const renderOkrNode = useCallback(
    ({ node, data }: NodeScope) => (
      <OkrNodeCard data={data as OkrNodeData} node={node} />
    ),
    [],
  );

  return (
    <DemoSection
      description={t("features.playground.okrTree.okrDescription")}
      title={t("features.playground.okrTree.okrTitle")}
    >
      {/*
       * 不用画布（OkrTreeViewport）：横向模式兄弟节点竖排、本就不会"掉下去"，
       * overflow-x 足够；且 scale 缩放会让文本发虚。默认全部展开（用户要求），
       * 宽出容量的部分由 overflow-x 滚动查看。
       */}
      <div className="okr-tree-demo overflow-x-auto rounded-2xl bg-default/30 p-4">
        <OkrTree<OkrNodeData>
          defaultExpandAll
          onlyBothTree
          showCollapsable
          showNodeNum
          unstyled
          data={objectiveData}
          direction="horizontal"
          leftData={initiativeData}
          nodeKey="id"
          renderNode={renderOkrNode}
        />
      </div>
    </DemoSection>
  );
}

/**
 * 演示场 › 组织架构树（react-okr-tree：组织架构 + 飞书 OKR 双向展开）。
 * 数据为本地工厂函数；外观经 --okr-* 变量挂接站点 token（okr-tree.css），
 * 不引入 html-to-image（导出图能力不在本演示范围）。
 */
export function OkrTreePage() {
  return (
    <PlaygroundPage meta={okrTreeMeta}>
      <OrgTreeSection />
      <OkrModeSection />
    </PlaygroundPage>
  );
}
