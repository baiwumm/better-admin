<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  clampZoom,
  OkrTreeViewport,
  VueOkrTree,
  type FilterNodeMethod,
  type TreeDirection,
  type TreeNodeData,
  type ViewportOffset,
  type VueOkrTreeInstance
} from 'vue3-okr-tree'
import 'vue3-okr-tree/style.css'

import DemoControl from '../DemoControl.vue'
import DemoSection from '../DemoSection.vue'
import DemoSegmented from '../DemoSegmented.vue'
import DemoSwitch from '../DemoSwitch.vue'
import PlaygroundPage from '../PlaygroundPage.vue'

import OkrNodeCard from './OkrNodeCard.vue'
import OrgNodeCard from './OrgNodeCard.vue'
import ViewportToolbar from './ViewportToolbar.vue'
import { okrTreeMeta } from './meta'
import {
  createOkrInitiativeData,
  createOkrObjectiveData,
  createOrgData,
  type OrgNodeData,
  type OkrNodeData
} from './okr-tree-data'

import './okr-tree.css'

/** fitToScreen 四周留白（px） */
const FIT_PADDING = 24
/** 缩放下限：全展开约 12 个叶子，过小缩放文本发虚，超出部分交拖拽平移 */
const MIN_ZOOM = 0.55

/**
 * 演示场 › 组织架构树（vue3-okr-tree：组织架构 + 飞书 OKR 双向展开），自 Vue 端同页平移。
 *
 * 与 React 基准对齐：数据本地工厂取数（命令式方法回写不互相污染）、
 * 外观经 --okr-* 变量挂 Nuxt UI token（okr-tree.css）、不引入可选 peer
 * html-to-image（导出图能力不在演示范围）。默认方向纵向（四端一致）。
 * 区块一走画布（OkrTreeViewport）：float 兄弟节点在定宽容器会换行"掉下去"，
 * 画布模式（canvas absolute + 内容 max-content）从根上避免换行；受控 zoom/offset
 * 由本页 fit 计算——内容宽高小于视口时保持 100% 居中（不放大），超出时缩放到
 * MIN_ZOOM 可读下限为止，剩余部分交拖拽平移。SSR 无需 <ClientOnly>：DOM 访问
 * 全在 onMounted / 事件回调内，fit 内有服务端守卫。
 */
const { t } = useI18n()

const orgTreeRef = ref<VueOkrTreeInstance>()
const canvasRef = ref<HTMLDivElement | null>(null)
const direction = ref<TreeDirection>('vertical')
const showNodeNum = ref(true)
const keyword = ref('')
const currentLabel = ref<string | null>(null)

/** 受控画布状态（v-model:zoom / v-model:offset） */
const zoom = ref(1)
const offset = ref<ViewportOffset>({ x: 0, y: 0 })

let fitObserver: ResizeObserver | undefined
let outerRaf = 0
let innerRaf = 0

/**
 * 画布自动适配：双 rAF 等 DOM 提交 + 布局稳定后重算。与包 fitToScreen 的
 * 差别：**缩放上限钳到 1**——内容小于视口时保持 100% 完整居中（用户要求
 * 默认不放大），仅内容超出时才缩小（不低于 MIN_ZOOM）。translate 取整：
 * 亚像素定位会让文本发虚。immediate watch 在 SSR setup 期也会触发，
 * 服务端无 rAF，直接返回（挂载后 onMounted 会再调一次）。
 */
function fit() {
  if (import.meta.server) return
  cancelAnimationFrame(outerRaf)
  cancelAnimationFrame(innerRaf)
  outerRaf = requestAnimationFrame(() => {
    innerRaf = requestAnimationFrame(() => {
      const viewport = canvasRef.value?.querySelector<HTMLElement>('.okr-viewport')
      const content = canvasRef.value?.querySelector<HTMLElement>(
        '.okr-viewport-content'
      )

      if (!viewport || !content) return
      const width = Math.max(1, content.offsetWidth)
      const height = Math.max(1, content.offsetHeight)
      const availWidth = Math.max(1, viewport.clientWidth - FIT_PADDING * 2)
      const availHeight = Math.max(1, viewport.clientHeight - FIT_PADDING * 2)
      const nextZoom = clampZoom(
        Math.min(availWidth / width, availHeight / height),
        MIN_ZOOM,
        1
      )

      zoom.value = nextZoom
      offset.value = {
        x: Math.round((viewport.clientWidth - width * nextZoom) / 2),
        y: Math.round((viewport.clientHeight - height * nextZoom) / 2)
      }
    })
  })
}

onMounted(() => {
  fit()
  // 只观察视口宽高（侧边栏折叠 / 窗口缩放）；内容尺寸变化不观察——避免单节点
  // 展开收起时视图被重算"跳回居中"，全局操作（全部展开 / 收起 / 过滤）显式 fit
  const viewport = canvasRef.value?.querySelector<HTMLElement>('.okr-viewport')

  if (!viewport) return
  fitObserver = new ResizeObserver(() => fit())
  fitObserver.observe(viewport)
})

onBeforeUnmount(() => {
  fitObserver?.disconnect()
  cancelAnimationFrame(outerRaf)
  cancelAnimationFrame(innerRaf)
})

function onCanvasDblclick(event: MouseEvent) {
  // 包把双击视口绑成回原点(0,0)的 reset——画布模式下视图会跳到左上角。
  // 捕获阶段拦下（含树外空白区域，包根元素不透传事件），改走页面 fit。
  if (
    event.target instanceof Element
    && event.target.closest('.okr-viewport-toolbar')
  )
    return
  event.stopPropagation()
  fit()
}

/** 两棵演示树各自经工厂取数 */
const orgData = createOrgData()
const objectiveData = createOkrObjectiveData()
const initiativeData = createOkrInitiativeData()

/** 名称 / 负责人包含关键字即命中；空值恢复全部（包约定空值也会调用 filter）。 */
const filterOrgNode: FilterNodeMethod = (value, data) => {
  if (!value) return true
  const node = data as OrgNodeData
  const text = String(value)

  return node.label.includes(text) || node.leader.includes(text)
}

// 方向切换 → 树按 key 重挂载，等 DOM 提交后重新适配
watch(direction, async () => {
  await nextTick()
  fit()
})

// 输入即过滤；命中节点的祖先由组件自动保持可见；过滤后可见宽度变化，重新适配
// （immediate 与 React 端挂载即调用对齐；fit 内部有服务端与视口未挂载守卫）
watch(
  keyword,
  (value) => {
    orgTreeRef.value?.filter(value)
    fit()
  },
  { immediate: true }
)

function handleExpandAll() {
  orgTreeRef.value?.expandAll()
  fit()
}

function handleCollapseAll() {
  orgTreeRef.value?.collapseAll()
  fit()
}

// 事件 data 为包内宽类型 TreeNodeData，此处收敛为本页节点类型（与 React 端 as cast 同模式）
function onOrgNodeClick(data: TreeNodeData) {
  currentLabel.value = (data as OrgNodeData).label
}
</script>

<template>
  <PlaygroundPage :meta="okrTreeMeta">
    <!-- 区块一：组织架构树（方向切换 / 展开控制 / 过滤 / 选中态，画布自动适配） -->
    <DemoSection
      :description="t('features.playground.okrTree.orgDescription')"
      :title="t('features.playground.okrTree.orgTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.okrTree.direction')">
          <DemoSegmented
            v-model="direction"
            :label="t('features.playground.okrTree.direction')"
            :options="[
              {
                id: 'horizontal',
                label: t('features.playground.okrTree.direction.horizontal')
              },
              {
                id: 'vertical',
                label: t('features.playground.okrTree.direction.vertical')
              }
            ]"
          />
        </DemoControl>
        <DemoControl :label="t('features.playground.okrTree.expand')">
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              @click="handleExpandAll"
            >
              {{ t('features.playground.okrTree.expandAll') }}
            </UButton>
            <UButton
              size="sm"
              variant="outline"
              @click="handleCollapseAll"
            >
              {{ t('features.playground.okrTree.collapseAll') }}
            </UButton>
          </div>
        </DemoControl>
        <DemoControl :label="t('features.playground.okrTree.search')">
          <UInput
            v-model="keyword"
            :aria-label="t('features.playground.okrTree.searchPlaceholder')"
            :placeholder="t('features.playground.okrTree.searchPlaceholder')"
            class="w-52"
            icon="i-lucide-search"
          />
        </DemoControl>
        <DemoSwitch
          v-model="showNodeNum"
          :label="t('features.playground.okrTree.showNodeNum')"
        />
      </template>

      <div
        ref="canvasRef"
        class="okr-tree-demo rounded-2xl bg-elevated/40 p-4"
        @dblclick.capture="onCanvasDblclick"
      >
        <OkrTreeViewport
          v-model:offset="offset"
          v-model:zoom="zoom"
          class="h-[480px]"
          :max-zoom="2"
          :min-zoom="MIN_ZOOM"
        >
          <template #toolbar="scope">
            <ViewportToolbar
              :scope="scope"
              @reset="fit"
            />
          </template>
          <!--
            direction 是创建期快照 prop，运行时切换按包约定绑定 key 重挂载
            （重置为 default-expanded-keys 的初始展开态，属预期行为）。
          -->
          <VueOkrTree
            :key="direction"
            ref="orgTreeRef"
            :data="orgData"
            :direction="direction"
            :filter-node-method="filterOrgNode"
            :default-expanded-keys="orgData.map((node) => node.id)"
            :show-collapsable="true"
            :show-node-num="showNodeNum"
            node-key="id"
            unstyled
            @node-click="onOrgNodeClick"
          >
            <template #default="{ node, data }">
              <OrgNodeCard
                :node="node"
                :data="(data as OrgNodeData)"
              />
            </template>
            <template #empty>
              <span class="text-muted text-xs">
                {{ t('features.playground.okrTree.empty') }}
              </span>
            </template>
          </VueOkrTree>
        </OkrTreeViewport>
      </div>
      <p class="text-muted text-xs">
        {{
          currentLabel
            ? t('features.playground.okrTree.currentNode', {
              label: currentLabel
            })
            : t('features.playground.okrTree.currentNodeEmpty')
        }}
      </p>
    </DemoSection>

    <!-- 区块二：OKR 双向展开（only-both-tree，左举措 / 右关键结果） -->
    <DemoSection
      :description="t('features.playground.okrTree.okrDescription')"
      :title="t('features.playground.okrTree.okrTitle')"
    >
      <!--
        不用画布（OkrTreeViewport）：横向模式兄弟节点竖排、本就不会"掉下去"，
        overflow-x 足够；且 scale 缩放会让文本发虚。默认全部展开（用户要求），
        宽出容量的部分由 overflow-x 滚动查看。
      -->
      <div class="okr-tree-demo overflow-x-auto rounded-2xl bg-elevated/40 p-4">
        <VueOkrTree
          :data="objectiveData"
          :left-data="initiativeData"
          direction="horizontal"
          node-key="id"
          only-both-tree
          :default-expand-all="true"
          :show-collapsable="true"
          :show-node-num="true"
          unstyled
        >
          <template #default="{ node, data }">
            <OkrNodeCard
              :node="node"
              :data="(data as OkrNodeData)"
            />
          </template>
        </VueOkrTree>
      </div>
    </DemoSection>
  </PlaygroundPage>
</template>
