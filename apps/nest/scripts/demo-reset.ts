// 置顶加载 .env：client.ts 在模块加载期即读取 process.env.DATABASE_URL。
import 'dotenv/config';
import 'reflect-metadata';
import { fakerZH_CN as faker, fakerEN } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';
import { hash } from 'bcrypt';
import { and, count, eq, inArray, ne, notInArray, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db, pool } from '../src/db/client';
import {
  depts,
  logs,
  menus,
  noticeReadRecords,
  noticeRemindLogs,
  notices,
  noticeScopes,
  notifications,
  posts,
  refreshTokens,
  roleMenus,
  roles,
  userPosts,
  userRoles,
  users,
} from '../src/db/schema';
import { Permissions, SUPER_ADMIN_ROLE_CODE } from '../src/db/schema/permissions.enum';
import {
  DEMO_ADMIN_ROLE_CODE,
  DEMO_RANDOM_ROLE_CODES,
  DEMO_SEED_LOG_DETAIL_KEY,
} from '../src/db/demo.constants';

/**
 * 演示数据重置脚本（Phase 0，计划 plan-dashboard-playground.md §3.1）。
 *
 * 用法：pnpm db:demo-reset --confirm
 *
 * - 安全阀：必须显式携带 --confirm；执行前打印目标库 host 与将删除的行数预估。
 * - 幂等：先清后生，固定 faker seed，重复执行产出一致的数据集（主键亦由 seed 派生）；
 *   时间字段相对执行时刻分布（近 30 天日志 / 近 1~3 年入职），不参与一致性比对。
 * - 清理顺序（按外键依赖）：日志 → refresh_tokens → 站内信 / 公告全套 → user_posts →
 *   非超管用户（含软删除，物理清除）→ 岗位 → 组织（叶子优先循环）→ 非 super_admin 角色。
 * - 保留：super_admin 角色、**内置 admin 用户**（2026-09-17 拍板：其余绑定 super_admin 的测试账号
 *   一并清理；admin 密码哈希原样保留，仅其 dept_id 置空）、菜单、字典。
 * - 头像：服务端下载真人风格照片（性别匹配）→ 转存 Storage avatars/demo/00xx.jpg（同名覆盖，
 *   文件名按 seed 序号确定，不随用户主键变化）→ 事务内落 URL；单张失败回退空头像。
 *   头像为网络 IO，放在事务之外先行完成。
 * - 数据写入整体事务包裹（清空到生成的中间态对外不可见）；插入按 100 条分批。
 */

const FAKER_SEED = 20260917;
/** 唯一保留的用户：系统内置超管账号（与 users.service 的 ADMIN_USERNAME / ADMIN_USER_PROTECTED 同一语义） */
const ADMIN_USERNAME = 'admin';
/** 统一演示密码（契约 v1.8.0 策略：8~20 位 ASCII、含字母与数字；仅服务端使用） */
const DEMO_PASSWORD = 'demo1234';
const BCRYPT_ROUNDS = 10;
const BATCH_SIZE = 100;
const AVATAR_BUCKET = 'avatars';
const AVATAR_CONCURRENCY = 6;
const AVATAR_FETCH_TIMEOUT_MS = 15_000;

const USER_COUNT = 150;
const NOTICE_COUNT = 40;
const LOG_COUNT = 900;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type RoleCode = typeof DEMO_ADMIN_ROLE_CODE | (typeof DEMO_RANDOM_ROLE_CODES)[number];

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 由 seed 派生的确定性主键（长度与项目 nanoid() 默认 21 一致） */
const id = () => faker.string.nanoid(21);

function chunk<T>(rows: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const pad4 = (n: number) => String(n).padStart(4, '0');

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

/** 近 N 天内的随机时刻，工作时段权重更高（日志 / 登录时间分布用） */
function randomRecentTime(days: number): Date {
  const dayOffset = faker.number.float({ min: 0, max: days });
  const base = Date.now() - dayOffset * DAY_MS;
  const d = new Date(base);
  const hour = faker.helpers.weightedArrayElement([
    { weight: 8, value: faker.number.int({ min: 9, max: 12 }) },
    { weight: 9, value: faker.number.int({ min: 13, max: 18 }) },
    { weight: 2, value: faker.number.int({ min: 19, max: 22 }) },
    { weight: 1, value: faker.number.int({ min: 0, max: 8 }) },
  ]);
  d.setHours(hour, faker.number.int({ min: 0, max: 59 }), faker.number.int({ min: 0, max: 59 }), 0);
  return d.getTime() > Date.now() ? new Date(Date.now() - faker.number.int({ min: 60, max: 3600 }) * 1000) : d;
}

const toDateString = (d: Date) => d.toISOString().slice(0, 10);

const phone = () =>
  `1${faker.helpers.arrayElement(['3', '5', '7', '8', '9'])}${faker.string.numeric(9)}`;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

// ---------------------------------------------------------------------------
// 静态设计：组织树 / 岗位 / 角色 / 权限矩阵
// ---------------------------------------------------------------------------

interface DeptDef {
  name: string;
  code: string;
  children?: DeptDef[];
}

/** 公司 → 中心 / 事业群 → 部门 → 小组（约 37 节点） */
const DEPT_TREE: DeptDef = {
  name: '星河科技集团',
  code: 'XH',
  children: [
    {
      name: '研发中心',
      code: 'RD',
      children: [
        { name: '前端部', code: 'RD-FE', children: [{ name: '前端一组', code: 'RD-FE-1' }, { name: '前端二组', code: 'RD-FE-2' }] },
        { name: '后端部', code: 'RD-BE', children: [{ name: '后端一组', code: 'RD-BE-1' }, { name: '后端二组', code: 'RD-BE-2' }] },
        { name: '测试部', code: 'RD-QA', children: [{ name: '功能测试组', code: 'RD-QA-1' }, { name: '自动化测试组', code: 'RD-QA-2' }] },
        { name: '架构部', code: 'RD-ARCH' },
        { name: '运维部', code: 'RD-OPS' },
      ],
    },
    {
      name: '产品事业群',
      code: 'PD',
      children: [
        { name: '产品部', code: 'PD-PM' },
        { name: '设计部', code: 'PD-UX' },
        { name: '运营部', code: 'PD-OP' },
      ],
    },
    {
      name: '市场中心',
      code: 'MK',
      children: [
        { name: '市场部', code: 'MK-MKT' },
        { name: '销售一部', code: 'MK-S1', children: [{ name: '华东区', code: 'MK-S1-E' }, { name: '华北区', code: 'MK-S1-N' }] },
        { name: '销售二部', code: 'MK-S2' },
        { name: '客户成功部', code: 'MK-CS' },
      ],
    },
    {
      name: '人力行政中心',
      code: 'HR',
      children: [
        { name: '人力资源部', code: 'HR-HR' },
        { name: '行政部', code: 'HR-ADM' },
        { name: '培训发展部', code: 'HR-LD' },
      ],
    },
    {
      name: '财务中心',
      code: 'FIN',
      children: [
        { name: '财务部', code: 'FIN-ACC' },
        { name: '审计部', code: 'FIN-AUD' },
      ],
    },
    {
      name: '数据智能事业群',
      code: 'DI',
      children: [
        { name: '数据平台部', code: 'DI-DP' },
        { name: '算法部', code: 'DI-ALG', children: [{ name: 'NLP 组', code: 'DI-ALG-NLP' }, { name: 'CV 组', code: 'DI-ALG-CV' }] },
      ],
    },
  ],
};

interface PostDef {
  name: string;
  deptCode: string;
  category: 'management' | 'professional' | 'production';
  rank: string;
  /** 该岗位可被哪些演示角色的用户担任（用户按角色从对应岗位池抽取） */
  pool: RoleCode[];
}

const POST_DEFS: PostDef[] = [
  { name: '技术总监', deptCode: 'RD', category: 'management', rank: 'M4', pool: ['sys_admin'] },
  { name: '架构师', deptCode: 'RD-ARCH', category: 'professional', rank: 'P8', pool: ['sys_admin'] },
  { name: '运维工程师', deptCode: 'RD-OPS', category: 'professional', rank: 'P6', pool: ['sys_admin'] },
  { name: '数据工程师', deptCode: 'DI-DP', category: 'professional', rank: 'P6', pool: ['sys_admin', 'employee'] },
  { name: '前端工程师', deptCode: 'RD-FE-1', category: 'professional', rank: 'P5', pool: ['employee'] },
  { name: '高级前端工程师', deptCode: 'RD-FE-2', category: 'professional', rank: 'P6', pool: ['employee'] },
  { name: '后端工程师', deptCode: 'RD-BE-1', category: 'professional', rank: 'P5', pool: ['employee'] },
  { name: '高级后端工程师', deptCode: 'RD-BE-2', category: 'professional', rank: 'P6', pool: ['employee'] },
  { name: '测试工程师', deptCode: 'RD-QA-1', category: 'professional', rank: 'P4', pool: ['employee'] },
  { name: '自动化测试工程师', deptCode: 'RD-QA-2', category: 'professional', rank: 'P5', pool: ['employee'] },
  { name: '算法工程师', deptCode: 'DI-ALG-NLP', category: 'professional', rank: 'P6', pool: ['employee'] },
  { name: '计算机视觉工程师', deptCode: 'DI-ALG-CV', category: 'professional', rank: 'P6', pool: ['employee'] },
  { name: '产品总监', deptCode: 'PD', category: 'management', rank: 'M3', pool: ['dept_manager'] },
  { name: '产品经理', deptCode: 'PD-PM', category: 'management', rank: 'M1', pool: ['dept_manager', 'employee'] },
  { name: 'UI 设计师', deptCode: 'PD-UX', category: 'professional', rank: 'P4', pool: ['employee'] },
  { name: '运营专员', deptCode: 'PD-OP', category: 'professional', rank: 'P3', pool: ['employee'] },
  { name: '市场总监', deptCode: 'MK', category: 'management', rank: 'M3', pool: ['dept_manager'] },
  { name: '市场专员', deptCode: 'MK-MKT', category: 'professional', rank: 'P3', pool: ['employee'] },
  { name: '销售经理', deptCode: 'MK-S1', category: 'management', rank: 'M2', pool: ['dept_manager'] },
  { name: '销售代表', deptCode: 'MK-S1-E', category: 'professional', rank: 'P3', pool: ['employee'] },
  { name: '大客户销售', deptCode: 'MK-S2', category: 'professional', rank: 'P5', pool: ['employee'] },
  { name: '客户成功经理', deptCode: 'MK-CS', category: 'management', rank: 'M1', pool: ['dept_manager', 'employee'] },
  { name: '人力资源总监', deptCode: 'HR', category: 'management', rank: 'M3', pool: ['dept_manager'] },
  { name: 'HR 专员', deptCode: 'HR-HR', category: 'professional', rank: 'P4', pool: ['hr_specialist'] },
  { name: '招聘专员', deptCode: 'HR-HR', category: 'professional', rank: 'P3', pool: ['hr_specialist'] },
  { name: '培训讲师', deptCode: 'HR-LD', category: 'professional', rank: 'P5', pool: ['hr_specialist'] },
  { name: '行政专员', deptCode: 'HR-ADM', category: 'professional', rank: 'P3', pool: ['employee'] },
  { name: '财务总监', deptCode: 'FIN', category: 'management', rank: 'M3', pool: ['dept_manager'] },
  { name: '会计', deptCode: 'FIN-ACC', category: 'professional', rank: 'P4', pool: ['employee'] },
  { name: '审计专员', deptCode: 'FIN-AUD', category: 'professional', rank: 'P4', pool: ['employee'] },
  { name: '实习生', deptCode: 'HR-LD', category: 'professional', rank: 'P1', pool: ['guest'] },
  { name: '外包顾问', deptCode: 'PD-OP', category: 'professional', rank: '', pool: ['guest'] },
];

interface RoleDef {
  code: RoleCode;
  name: string;
  description: string;
  sort: number;
  /** 用户占比（%） */
  ratio: number;
}

const ROLE_DEFS: RoleDef[] = [
  { code: 'sys_admin', name: '系统管理员', description: '演示角色：全部菜单与按钮位（写操作受只读守卫拦截）', sort: 100, ratio: 5 },
  { code: 'dept_manager', name: '部门主管', description: '演示角色：组织中心全套 + 系统设置只读', sort: 80, ratio: 10 },
  { code: 'hr_specialist', name: 'HR 专员', description: '演示角色：用户管理 + 组织 / 岗位 / 通讯录 / 公告', sort: 60, ratio: 5 },
  { code: 'employee', name: '普通员工', description: '演示角色：公告 / 通讯录 / 架构图谱 / 演示场（纯查看）', sort: 40, ratio: 70 },
  { code: 'guest', name: '访客', description: '演示角色：最小集（公告 / 站内信）', sort: 20, ratio: 10 },
];

const SEARCH_ONLY = Permissions.SEARCH.bits;
/** 取菜单自身声明的全部按钮位 */
const DECLARED = Symbol('declared');
type MatrixBits = bigint | typeof DECLARED;

const SYSTEM_KEYS = ['menu.users', 'menu.roles', 'menu.permissions', 'menu.menus', 'menu.dicts', 'menu.logs'];
const ORG_KEYS = ['menu.depts', 'menu.posts', 'menu.directory', 'menu.notices', 'menu.org-chart'];

/**
 * 演示角色权限矩阵（计划 §3.1 2026-09-15 拍板默认版）。
 * 目录节点授 0 位（仅可见）；「只读可见 / 纯查看」落地为 SEARCH 单一位——
 * 列表 GET 端点均要求 SEARCH，0 位页面可见但接口 403。
 */
function buildMatrix(allMenuKeys: string[]): Record<RoleCode, Record<string, MatrixBits>> {
  const withParents = (entries: Record<string, MatrixBits>, parents: string[]) => {
    for (const p of parents) entries[p] = 0n;
    return entries;
  };
  const playgroundKeys = allMenuKeys.filter((k) => k.startsWith('menu.playground'));

  const sysAdmin: Record<string, MatrixBits> = {};
  for (const k of allMenuKeys) sysAdmin[k] = DECLARED;

  const deptManager = withParents(
    {
      ...Object.fromEntries(ORG_KEYS.map((k) => [k, DECLARED])),
      ...Object.fromEntries(SYSTEM_KEYS.map((k) => [k, SEARCH_ONLY])),
    },
    ['menu.org', 'menu.system'],
  );

  const hr = withParents(
    {
      'menu.users': DECLARED,
      ...Object.fromEntries(['menu.depts', 'menu.posts', 'menu.directory', 'menu.notices'].map((k) => [k, DECLARED])),
    },
    ['menu.org', 'menu.system'],
  );

  const employee = withParents(
    {
      'menu.notices': SEARCH_ONLY,
      'menu.directory': SEARCH_ONLY,
      'menu.org-chart': SEARCH_ONLY,
      ...Object.fromEntries(playgroundKeys.map((k) => [k, 0n])),
    },
    ['menu.org'],
  );

  const guest = withParents({ 'menu.notices': SEARCH_ONLY }, ['menu.org']);

  return { sys_admin: sysAdmin, dept_manager: deptManager, hr_specialist: hr, employee, guest };
}

// ---------------------------------------------------------------------------
// 公告文案模板
// ---------------------------------------------------------------------------

const NOTICE_TITLES = [
  '关于召开第{q}季度全员大会的通知',
  '{m}月员工生日会活动安排',
  '系统维护公告：{date} 晚间停机升级',
  '年度员工体检安排通知',
  '新员工入职培训计划（{m}月批次）',
  '关于{holiday}放假安排的通知',
  '办公区域调整与工位搬迁通知',
  '信息安全提醒：请及时更新账号密码',
  '第{q}季度优秀员工评选结果公示',
  '年度绩效考核启动通知',
  '关于规范差旅报销流程的通知',
  '技术分享会：{topic} 主题沙龙',
  '{m}月团建活动报名开启',
  '关于更新员工手册的通知',
  '内部推荐奖励计划升级说明',
  '服务器机房例行巡检安排',
];
const HOLIDAYS = ['国庆节', '中秋节', '端午节', '劳动节', '春节', '元旦'];
const TOPICS = ['前端性能优化', '微服务治理', '数据可视化实践', '大模型应用落地', '自动化测试体系'];
const PARAGRAPHS = [
  '各位同事：为进一步提升团队协作效率、统一工作口径，现将相关安排通知如下，请各部门负责人组织学习并落实到位。',
  '请各位同事按时参加，如因特殊情况无法出席，请提前向所在部门负责人请假并做好工作交接。',
  '本次安排涉及的具体时间、地点及注意事项详见附件，如有疑问请联系人力行政中心。',
  '请大家相互转告，并在规定时间内完成相关事项。感谢各位的理解与配合！',
  '相关制度自发布之日起生效，此前与本通知不一致的规定以本通知为准。',
  '如需了解更多信息，可通过内部知识库查阅或在工作群中反馈，我们将及时答复。',
];

function noticeTitle(): string {
  const t = faker.helpers.arrayElement(NOTICE_TITLES);
  return t
    .replace('{q}', String(faker.number.int({ min: 1, max: 4 })))
    .replace('{m}', String(faker.number.int({ min: 1, max: 12 })))
    .replace('{date}', `${faker.number.int({ min: 1, max: 12 })}月${faker.number.int({ min: 1, max: 28 })}日`)
    .replace('{holiday}', faker.helpers.arrayElement(HOLIDAYS))
    .replace('{topic}', faker.helpers.arrayElement(TOPICS));
}

function noticeContent(title: string): string {
  const paras = faker.helpers.arrayElements(PARAGRAPHS, { min: 2, max: 4 });
  return [`<h2>${title}</h2>`, ...paras.map((p) => `<p>${p}</p>`), '<p>星河科技集团</p>'].join('');
}

// ---------------------------------------------------------------------------
// 数据集构建（纯计算，确定性）
// ---------------------------------------------------------------------------

interface DeptRow {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  sort: number;
  depth: number;
}
interface PostRow {
  id: string;
  deptId: string;
  name: string;
  category: string;
  rank: string;
  def: PostDef;
}
interface UserRow {
  id: string;
  seq: number;
  username: string;
  email: string;
  displayName: string;
  gender: 'male' | 'female';
  phone: string;
  deptId: string;
  postId: string;
  employeeNo: string;
  employmentStatus: 'employed' | 'resigned';
  entryDate: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  tags: string[];
  status: 'active' | 'disabled';
  role: RoleCode;
  avatar: string | null;
}

function buildDepts(): DeptRow[] {
  const rows: DeptRow[] = [];
  const walk = (def: DeptDef, parentId: string | null, depth: number, sort: number) => {
    const row: DeptRow = { id: id(), parentId, name: def.name, code: def.code, sort, depth };
    rows.push(row);
    def.children?.forEach((c, i) => walk(c, row.id, depth + 1, (def.children!.length - i) * 10));
  };
  walk(DEPT_TREE, null, 0, 100);
  return rows;
}

function buildPosts(deptByCode: Map<string, DeptRow>): PostRow[] {
  return POST_DEFS.map((def) => {
    const dept = deptByCode.get(def.deptCode);
    if (!dept) throw new Error(`[demo-reset] 岗位 ${def.name} 引用了不存在的组织 ${def.deptCode}`);
    return { id: id(), deptId: dept.id, name: def.name, category: def.category, rank: def.rank, def };
  });
}

function roleSlots(): RoleCode[] {
  const slots: RoleCode[] = [];
  for (const r of ROLE_DEFS) {
    const n = Math.round((USER_COUNT * r.ratio) / 100);
    for (let i = 0; i < n; i++) slots.push(r.code);
  }
  while (slots.length < USER_COUNT) slots.push('employee');
  return faker.helpers.shuffle(slots.slice(0, USER_COUNT));
}

const TAG_POOL = ['全栈', '技术分享', '跑步', '摄影', '读书会', '开源', '设计', '篮球', '咖啡', '产品思维', '数据', '英语角'];

function buildUsers(postRows: PostRow[]): UserRow[] {
  const slots = roleSlots();
  const usedNames = new Set<string>();
  const rows: UserRow[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const role = slots[i];
    const pool = postRows.filter((p) => p.def.pool.includes(role));
    const post = faker.helpers.arrayElement(pool);
    const gender = faker.helpers.arrayElement(['male', 'female'] as const);
    const displayName = faker.person.fullName({ sex: gender });

    let username = fakerEN.internet.username().toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 18);
    if (username.length < 3) username = `user${username}`;
    while (usedNames.has(username)) username = `${username}${faker.number.int({ min: 1, max: 99 })}`;
    usedNames.add(username);

    // 最近 12 人为近 30 天新入职（其中后 4 人在近 7 天），供 Dashboard KPI「今日 / 近 7 日新增」有活数据
    const recent = i >= USER_COUNT - 12;
    const veryRecent = i >= USER_COUNT - 4;
    const createdAt = veryRecent
      ? randomRecentTime(6)
      : recent
        ? randomRecentTime(29)
        : faker.date.between({ from: daysAgo(365 * 3), to: daysAgo(31) });

    const employmentStatus: UserRow['employmentStatus'] =
      !recent && role === 'employee' && faker.number.int({ min: 1, max: 100 }) <= 5 ? 'resigned' : 'employed';
    const status: UserRow['status'] =
      role === 'employee' && !recent && faker.number.int({ min: 1, max: 100 }) <= 2 ? 'disabled' : 'active';
    const lastLoginAt =
      status === 'active' && faker.number.int({ min: 1, max: 100 }) <= 80 ? randomRecentTime(30) : null;

    rows.push({
      id: id(),
      seq: i + 1,
      username,
      email: `${username}@demo.better-admin.com`,
      displayName,
      gender,
      phone: phone(),
      deptId: post.deptId,
      postId: post.id,
      employeeNo: `XH${pad4(i + 1)}`,
      employmentStatus,
      entryDate: toDateString(createdAt),
      createdAt,
      lastLoginAt,
      tags: faker.helpers.arrayElements(TAG_POOL, { min: 0, max: 3 }),
      status,
      role,
      avatar: null,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 头像：下载 → 转存 Storage（事务外）
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AVATAR_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function uploadAvatars(userRows: UserRow[]): Promise<{ ok: number; failed: number }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    console.warn('[demo-reset] SUPABASE_URL / SUPABASE_SECRET_KEY 未设置，全部用户回退空头像');
    return { ok: 0, failed: userRows.length };
  }
  const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

  // 头像 URL 由 seed 派生（faker 与用户序号绑定），先于并发下载全部确定，保证确定性
  const jobs = userRows.map((u) => ({
    user: u,
    source: faker.image.personPortrait({ sex: u.gender, size: 256 }),
    objectPath: `demo/${pad4(u.seq)}.jpg`,
  }));

  let ok = 0;
  let failed = 0;
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const job = jobs[cursor++];
      if (!job) return;
      try {
        const buffer = await fetchWithTimeout(job.source);
        const { error } = await client.storage
          .from(AVATAR_BUCKET)
          .upload(job.objectPath, buffer, { contentType: 'image/jpeg', upsert: true });
        if (error) throw new Error(error.message);
        // 不带缓存穿透参数：同名覆盖且内容由 seed 决定，重跑 URL 保持一致
        job.user.avatar = `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${job.objectPath}`;
        ok++;
      } catch (err) {
        failed++;
        console.warn(`[demo-reset] 头像 ${job.objectPath} 处理失败，回退空头像：${(err as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: AVATAR_CONCURRENCY }, worker));
  return { ok, failed };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function estimateDeletions(keptUserIds: string[]) {
  const countOf = async (table: PgTable, where?: SQL) => {
    const q = db.select({ n: count() }).from(table);
    const [row] = where ? await q.where(where) : await q;
    return Number(row?.n ?? 0);
  };
  return {
    logs: await countOf(logs),
    refresh_tokens: await countOf(refreshTokens),
    notifications: await countOf(notifications),
    notices: await countOf(notices),
    user_posts: await countOf(userPosts),
    users: await countOf(users, notInArray(users.id, keptUserIds)),
    posts: await countOf(posts),
    depts: await countOf(depts),
    roles: await countOf(roles, ne(roles.code, SUPER_ADMIN_ROLE_CODE)),
  };
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const started = Date.now();
  faker.seed(FAKER_SEED);
  fakerEN.seed(FAKER_SEED);

  const dbUrl = process.env.DATABASE_URL!;
  console.log(`[demo-reset] 目标数据库：${new URL(dbUrl).host}`);

  // 保留集合：仅内置 admin 用户（密码哈希与其余字段原样保留）；其余 super_admin 绑定账号视为测试残留一并清理。
  // admin 缺失时拒绝执行——宁可不跑，也不能让库里没有任何可用超管。
  const kept = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME))
    .limit(1);
  const keptIds = kept.map((k) => k.id);
  if (keptIds.length === 0) throw new Error(`[demo-reset] 未找到内置 ${ADMIN_USERNAME} 用户，拒绝执行（保护超管）`);
  const adminBoundSuper = await db
    .select({ id: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.code, SUPER_ADMIN_ROLE_CODE)))
    .where(eq(userRoles.userId, keptIds[0]!))
    .then((rows) => rows.length > 0);
  if (!adminBoundSuper) throw new Error(`[demo-reset] ${ADMIN_USERNAME} 未绑定 super_admin 角色，状态异常，拒绝执行`);
  console.log(`[demo-reset] 保留用户：${kept.map((k) => k.username).join(', ')}（其余 super_admin 绑定账号将一并清理）`);

  const estimate = await estimateDeletions(keptIds);
  console.log('[demo-reset] 将删除行数预估：', estimate);

  if (!confirm) {
    console.error('\n[demo-reset] 未携带 --confirm，拒绝执行。确认后运行：pnpm db:demo-reset --confirm');
    process.exitCode = 1;
    return;
  }

  // ---- 菜单映射（保留数据，仅读取） ----
  const menuRows = await db.select({ id: menus.id, i18nKey: menus.i18nKey, permissions: menus.permissions }).from(menus);
  const menuByKey = new Map(menuRows.filter((m) => m.i18nKey).map((m) => [m.i18nKey!, m]));
  const matrix = buildMatrix([...menuByKey.keys()]);

  // ---- 构建数据集 ----
  const deptRows = buildDepts();
  const deptByCode = new Map(deptRows.map((d) => [d.code, d]));
  const deptById = new Map(deptRows.map((d) => [d.id, d]));
  const postRows = buildPosts(deptByCode);
  const userRows = buildUsers(postRows);
  const usersByRole = (code: RoleCode) => userRows.filter((u) => u.role === code);

  // 组织负责人：部门主管担任所在部门负责人；中心级由系统管理员补位
  const leaderByDept = new Map<string, string>();
  for (const u of usersByRole('dept_manager')) {
    if (!leaderByDept.has(u.deptId)) leaderByDept.set(u.deptId, u.id);
  }
  for (const d of deptRows.filter((d) => d.depth <= 1)) {
    if (!leaderByDept.has(d.id)) {
      const pick = faker.helpers.arrayElement(usersByRole('sys_admin'));
      leaderByDept.set(d.id, pick.id);
    }
  }

  // 组织后代映射（公告范围解析用）
  const childrenOf = new Map<string, string[]>();
  for (const d of deptRows) {
    if (d.parentId) childrenOf.set(d.parentId, [...(childrenOf.get(d.parentId) ?? []), d.id]);
  }
  const descendants = (deptId: string): Set<string> => {
    const out = new Set<string>([deptId]);
    const stack = [deptId];
    while (stack.length) {
      for (const c of childrenOf.get(stack.pop()!) ?? []) {
        out.add(c);
        stack.push(c);
      }
    }
    return out;
  };

  // ---- 公告 / 范围 / 站内信 / 阅读记录 ----
  const publishers = [...usersByRole('sys_admin'), ...usersByRole('hr_specialist')];
  const noticeRows: (typeof notices.$inferInsert)[] = [];
  const scopeRows: (typeof noticeScopes.$inferInsert)[] = [];
  const notificationRows: (typeof notifications.$inferInsert)[] = [];
  const readRows: (typeof noticeReadRecords.$inferInsert)[] = [];

  for (let i = 0; i < NOTICE_COUNT; i++) {
    const status = i < 30 ? 'published' : i < 35 ? 'draft' : 'withdrawn';
    const title = noticeTitle();
    const publishTime =
      status === 'draft'
        ? new Date(Date.now() + faker.number.int({ min: 1, max: 10 }) * DAY_MS)
        : randomRecentTime(60);
    const createdAt = new Date(publishTime.getTime() - faker.number.int({ min: 1, max: 72 }) * HOUR_MS);
    const noticeId = id();
    noticeRows.push({
      id: noticeId,
      title,
      content: noticeContent(title),
      publisherId: faker.helpers.arrayElement(publishers).id,
      isTop: status === 'published' && i < 3,
      status,
      publishTime,
      createdAt,
      updatedAt: createdAt,
    });

    // 范围：约 1/4 全员（根组织），其余 1~3 个组织 / 岗位 / 人员混合
    const recipients = new Set<string>();
    if (faker.number.int({ min: 1, max: 4 }) === 1) {
      scopeRows.push({ id: id(), noticeId, scopeType: 'dept', targetId: deptRows[0].id, createdAt });
      for (const u of userRows) recipients.add(u.id);
    } else {
      const n = faker.number.int({ min: 1, max: 3 });
      for (let s = 0; s < n; s++) {
        const kind = faker.helpers.weightedArrayElement([
          { weight: 5, value: 'dept' as const },
          { weight: 2, value: 'post' as const },
          { weight: 2, value: 'user' as const },
        ]);
        if (kind === 'dept') {
          const d = faker.helpers.arrayElement(deptRows.filter((x) => x.depth >= 1));
          scopeRows.push({ id: id(), noticeId, scopeType: 'dept', targetId: d.id, createdAt });
          const set = descendants(d.id);
          for (const u of userRows) if (set.has(u.deptId)) recipients.add(u.id);
        } else if (kind === 'post') {
          const p = faker.helpers.arrayElement(postRows);
          scopeRows.push({ id: id(), noticeId, scopeType: 'post', targetId: p.id, createdAt });
          for (const u of userRows) if (u.postId === p.id) recipients.add(u.id);
        } else {
          const u = faker.helpers.arrayElement(userRows);
          scopeRows.push({ id: id(), noticeId, scopeType: 'user', targetId: u.id, createdAt });
          recipients.add(u.id);
        }
      }
    }

    if (status !== 'published') continue;
    // 站内信：每条公告最多推送 12 人（保持铃铛体量适中），约 55% 已读并留下阅读记录
    const targets = faker.helpers.arrayElements([...recipients], { min: Math.min(3, recipients.size), max: Math.min(12, recipients.size) });
    for (const userId of targets) {
      const read = faker.number.int({ min: 1, max: 100 }) <= 55;
      const readAt = read
        ? new Date(Math.min(Date.now(), publishTime.getTime() + faker.number.int({ min: 1, max: 96 }) * HOUR_MS))
        : null;
      notificationRows.push({
        id: id(),
        recipientId: userId,
        type: 'notice_publish',
        title: `新公告：${title}`,
        content: PARAGRAPHS[0].slice(0, 60),
        link: `/org/notices/${noticeId}`,
        readAt,
        createdAt: publishTime,
      });
      if (readAt) {
        readRows.push({ id: id(), noticeId, userId, readAt, ipAddress: faker.internet.ipv4() });
      }
    }
  }

  // ---- 日志（四类、近 30 天、seed 布景标记） ----
  const OPERATION_ACTIONS = [
    'user.create', 'user.update', 'user.delete', 'role.create', 'role.update', 'menu.update',
    'dept.create', 'dept.update', 'dept.sort', 'post.create', 'post.update',
    'notice.create', 'notice.update', 'notice.withdraw', 'notice.remind', 'log.delete',
  ];
  const API_PATHS = [
    ['GET', '/api/users?page=1&pageSize=10'], ['GET', '/api/auth/me'], ['GET', '/api/menus'],
    ['GET', '/api/org/depts/tree'], ['GET', '/api/org/directory?page=1&pageSize=20'],
    ['GET', '/api/notices/mine?page=1&pageSize=10'], ['GET', '/api/notifications/unread-count'],
    ['POST', '/api/notices'], ['PUT', '/api/users/'], ['POST', '/api/org/depts'],
    ['GET', '/api/roles'], ['GET', '/api/dict/types'], ['POST', '/api/notifications/read-all'],
  ];
  const ERROR_CASES = [
    [404, 'NOT_FOUND', '资源不存在', 'GET', '/api/users/'],
    [403, 'FORBIDDEN', '无权限', 'DELETE', '/api/roles/'],
    [400, 'VALIDATION_ERROR', '请求参数校验失败', 'POST', '/api/users'],
    [401, 'UNAUTHORIZED', '未登录或 token 无效', 'GET', '/api/auth/me'],
    [409, 'DICT_TYPE_IN_USE', '字典类型仍被引用', 'DELETE', '/api/dict/types/'],
  ] as const;
  const activeUsers = userRows.filter((u) => u.status === 'active');
  const weightedActor = () =>
    faker.helpers.weightedArrayElement([
      { weight: 4, value: 'sys_admin' as RoleCode },
      { weight: 3, value: 'dept_manager' as RoleCode },
      { weight: 2, value: 'hr_specialist' as RoleCode },
      { weight: 5, value: 'employee' as RoleCode },
      { weight: 1, value: 'guest' as RoleCode },
    ]);
  const pickActor = () => {
    const pool = activeUsers.filter((u) => u.role === weightedActor());
    return faker.helpers.arrayElement(pool.length ? pool : activeUsers);
  };
  const seedMark = { [DEMO_SEED_LOG_DETAIL_KEY]: true };
  const logRows: (typeof logs.$inferInsert)[] = [];
  for (let i = 0; i < LOG_COUNT; i++) {
    const type = faker.helpers.weightedArrayElement([
      { weight: 36, value: 'login' },
      { weight: 34, value: 'api' },
      { weight: 18, value: 'operation' },
      { weight: 12, value: 'error' },
    ]);
    const actor = pickActor();
    const base = {
      id: id(),
      type,
      userId: actor.id,
      ip: faker.internet.ipv4(),
      userAgent: faker.helpers.arrayElement(USER_AGENTS),
      createdAt: randomRecentTime(30),
    };
    if (type === 'login') {
      logRows.push({
        ...base,
        action: faker.helpers.weightedArrayElement([
          { weight: 5, value: 'login.success' },
          { weight: 3, value: 'login.success.remember' },
          { weight: 2, value: 'login.success.demo' },
          { weight: 3, value: 'logout' },
        ]),
        detail: seedMark,
      });
    } else if (type === 'operation') {
      const action = faker.helpers.arrayElement(OPERATION_ACTIONS);
      logRows.push({ ...base, action, detail: { ...seedMark, targetId: id() } });
    } else if (type === 'api') {
      const [method, path] = faker.helpers.arrayElement(API_PATHS);
      logRows.push({
        ...base,
        action: `${method} ${path}${path.endsWith('/') ? id() : ''}`,
        detail: { ...seedMark, status: 200, durationMs: faker.number.int({ min: 12, max: 480 }) },
      });
    } else {
      const [status, code, message, method, path] = faker.helpers.arrayElement(ERROR_CASES);
      logRows.push({
        ...base,
        userId: status === 401 ? null : actor.id,
        action: `error.${status}`,
        detail: { ...seedMark, code, message, method, path: `${path}${path.endsWith('/') ? id() : ''}`, stack: message },
      });
    }
  }

  // ---- 头像（网络 IO，事务外） ----
  console.log(`[demo-reset] 下载并转存 ${userRows.length} 张头像（并发 ${AVATAR_CONCURRENCY}）...`);
  const avatarResult = await uploadAvatars(userRows);
  console.log(`[demo-reset] 头像完成：成功 ${avatarResult.ok}，回退空头像 ${avatarResult.failed}`);

  const passwordHash = await hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const roleIdByCode = new Map<RoleCode, string>(ROLE_DEFS.map((r) => [r.code, id()]));

  // ---- 事务：清理 + 写入 ----
  await db.transaction(async (tx) => {
    // 1. 清理（有意的整表删除，顺序按外键依赖）
    await tx.delete(logs);
    await tx.delete(refreshTokens);
    await tx.delete(notifications);
    await tx.delete(noticeRemindLogs);
    await tx.delete(noticeReadRecords);
    await tx.delete(noticeScopes);
    await tx.delete(notices);
    await tx.delete(userPosts);
    // 保留用户的组织归属置空（组织即将整体重建）
    await tx.update(users).set({ deptId: null }).where(inArray(users.id, keptIds));
    // 非超管用户物理删除（含软删除行；user_roles 随外键级联）
    await tx.delete(users).where(notInArray(users.id, keptIds));
    await tx.delete(posts);
    // 组织自引用 RESTRICT：叶子优先循环删除
    for (;;) {
      const res = await tx.execute(
        sql`delete from depts where id not in (select parent_id from depts where parent_id is not null)`,
      );
      if ((res.rowCount ?? 0) === 0) break;
    }
    await tx.delete(roles).where(ne(roles.code, SUPER_ADMIN_ROLE_CODE));

    // 2. 角色 + 权限矩阵
    await tx.insert(roles).values(
      ROLE_DEFS.map((r) => ({
        id: roleIdByCode.get(r.code)!,
        name: r.name,
        code: r.code,
        description: r.description,
        enabled: true,
        sort: r.sort,
      })),
    );
    const roleMenuRows: (typeof roleMenus.$inferInsert)[] = [];
    for (const r of ROLE_DEFS) {
      for (const [key, bits] of Object.entries(matrix[r.code])) {
        const menu = menuByKey.get(key);
        if (!menu) continue;
        roleMenuRows.push({
          roleId: roleIdByCode.get(r.code)!,
          menuId: menu.id,
          permissions: bits === DECLARED ? menu.permissions : bits,
        });
      }
    }
    for (const part of chunk(roleMenuRows)) await tx.insert(roleMenus).values(part);

    // 3. 组织（父先于子）→ 岗位
    for (const part of chunk([...deptRows].sort((a, b) => a.depth - b.depth))) {
      await tx.insert(depts).values(
        part.map((d) => ({ id: d.id, parentId: d.parentId, name: d.name, code: d.code, sort: d.sort, status: 'enabled' })),
      );
    }
    for (const part of chunk(postRows)) {
      await tx.insert(posts).values(
        part.map((p) => ({ id: p.id, deptId: p.deptId, name: p.name, category: p.category, rank: p.rank, status: 'enabled' })),
      );
    }

    // 4. 用户 → 角色绑定 → 岗位绑定 → 组织负责人
    for (const part of chunk(userRows)) {
      await tx.insert(users).values(
        part.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          passwordHash,
          displayName: u.displayName,
          avatar: u.avatar,
          phone: u.phone,
          tags: u.tags,
          lastLoginAt: u.lastLoginAt,
          deptId: u.deptId,
          employeeNo: u.employeeNo,
          employmentStatus: u.employmentStatus,
          entryDate: u.entryDate,
          gender: u.gender,
          status: u.status,
          createdAt: u.createdAt,
          updatedAt: u.createdAt,
        })),
      );
    }
    for (const part of chunk(userRows)) {
      await tx.insert(userRoles).values(part.map((u) => ({ userId: u.id, roleId: roleIdByCode.get(u.role)! })));
    }
    for (const part of chunk(userRows)) {
      await tx.insert(userPosts).values(part.map((u) => ({ id: id(), userId: u.id, postId: u.postId, isMain: true })));
    }
    for (const [deptId, leaderId] of leaderByDept) {
      await tx.update(depts).set({ leaderId }).where(eq(depts.id, deptId));
    }

    // 5. 公告全套 → 站内信 → 阅读记录
    for (const part of chunk(noticeRows)) await tx.insert(notices).values(part);
    for (const part of chunk(scopeRows)) await tx.insert(noticeScopes).values(part);
    for (const part of chunk(notificationRows)) await tx.insert(notifications).values(part);
    for (const part of chunk(readRows)) await tx.insert(noticeReadRecords).values(part);

    // 6. 布景日志
    for (const part of chunk(logRows)) await tx.insert(logs).values(part);
  });

  // ---- 结果核对 ----
  const after = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(inArray(users.id, keptIds));
  const hashIntact = kept.every((k) => after.find((a) => a.id === k.id)?.passwordHash === k.passwordHash);
  const roleStats = ROLE_DEFS.map((r) => `${r.name} ${userRows.filter((u) => u.role === r.code).length}`).join(' / ');

  console.log('\n[demo-reset] 完成，耗时', ((Date.now() - started) / 1000).toFixed(1), 's');
  console.log(`  组织 ${deptRows.length} / 岗位 ${postRows.length} / 角色 ${ROLE_DEFS.length} / 用户 ${userRows.length}（${roleStats}）`);
  console.log(`  公告 ${noticeRows.length}（范围 ${scopeRows.length}）/ 站内信 ${notificationRows.length} / 阅读记录 ${readRows.length} / 布景日志 ${logRows.length}`);
  console.log(`  头像成功 ${avatarResult.ok} / 回退 ${avatarResult.failed}`);
  console.log(`  超管密码哈希未变：${hashIntact ? '是' : '否（异常！）'}`);
  console.log(`  演示密码：${DEMO_PASSWORD}（快捷登录池：admin=${DEMO_ADMIN_ROLE_CODE}，random=${DEMO_RANDOM_ROLE_CODES.join('/')}）`);
  if (!hashIntact) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('[demo-reset] 执行失败（事务已回滚）:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
