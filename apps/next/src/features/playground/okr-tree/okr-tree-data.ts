/**
 * OKR 树演示数据（本地确定性数据，不请求接口）。
 *
 * 工厂函数而非模块常量：组件的命令式方法（append / remove / moveNode 等）会回写源数据，
 * 每棵树经各自工厂取数，避免两份演示互相污染（包 README「需要注意的行为」）。
 */

/** 组织架构节点：部门 + 负责人 + 人数。 */
export interface OrgNodeData {
  id: string;
  label: string;
  leader: string;
  count: number;
  children?: OrgNodeData[];
}

/** OKR 节点：目标 / 关键结果 / 关键举措，KR 与举措带进度。 */
export interface OkrNodeData {
  id: string;
  label: string;
  meta?: string;
  progress?: number;
  children?: OkrNodeData[];
}

/** 组织架构演示数据（一棵多叉树）。 */
export function createOrgData(): OrgNodeData[] {
  return [
    {
      id: "hq",
      label: "总部",
      leader: "首席执行官",
      count: 128,
      children: [
        {
          id: "rd",
          label: "产品研发中心",
          leader: "技术副总裁",
          count: 56,
          children: [
            { id: "rd-fe", label: "前端组", leader: "张晓", count: 12 },
            { id: "rd-be", label: "后端组", leader: "李默", count: 18 },
            { id: "rd-qa", label: "测试组", leader: "陈雨", count: 8 },
          ],
        },
        {
          id: "design",
          label: "设计中心",
          leader: "设计总监",
          count: 14,
          children: [
            { id: "design-ux", label: "用户体验组", leader: "王淇", count: 6 },
            { id: "design-ui", label: "视觉设计组", leader: "赵青", count: 8 },
          ],
        },
        {
          id: "growth",
          label: "市场增长中心",
          leader: "增长负责人",
          count: 32,
          children: [
            {
              id: "growth-content",
              label: "内容运营组",
              leader: "刘一",
              count: 10,
            },
            {
              id: "growth-channel",
              label: "渠道拓展组",
              leader: "孙朗",
              count: 14,
            },
          ],
        },
        {
          id: "ga",
          label: "职能中心",
          leader: "运营副总裁",
          count: 26,
          children: [
            { id: "ga-hr", label: "人力资源部", leader: "周敏", count: 9 },
            { id: "ga-fin", label: "财务部", leader: "吴桐", count: 7 },
          ],
        },
      ],
    },
  ];
}

/** OKR 右树：第一个根节点即目标 O，其 children 为关键结果。 */
export function createOkrObjectiveData(): OkrNodeData[] {
  return [
    {
      id: "o-q3",
      label: "Q3 目标：DAU 提升 30%",
      meta: "产品与增长",
      progress: 62,
      children: [
        {
          id: "kr-1",
          label: "KR1 新用户 7 日留存 ≥ 45%",
          meta: "增长团队",
          progress: 58,
        },
        {
          id: "kr-2",
          label: "KR2 核心功能渗透率 ≥ 60%",
          meta: "产品团队",
          progress: 71,
        },
        {
          id: "kr-3",
          label: "KR3 崩溃率降至 0.1% 以下",
          meta: "研发团队",
          progress: 84,
        },
      ],
    },
  ];
}

/**
 * OKR 左树：leftData[0].children 会挂到右树根节点（目标 O）的左侧，
 * leftData 的根自身不渲染——这里它只是「关键举措」的容器。
 */
export function createOkrInitiativeData(): OkrNodeData[] {
  return [
    {
      id: "initiatives-root",
      label: "关键举措",
      children: [
        {
          id: "init-1",
          label: "新手引导流程改版",
          meta: "设计 + 前端",
          progress: 70,
        },
        {
          id: "init-2",
          label: "性能与稳定性专项",
          meta: "架构组",
          progress: 90,
        },
        { id: "init-3", label: "创作者激励计划", meta: "运营组", progress: 40 },
      ],
    },
  ];
}
