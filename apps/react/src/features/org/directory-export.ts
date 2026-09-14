import type { DirectoryEntry } from "@/lib/api-types";
import type { TFunction } from "i18next";
import type { Column } from "write-excel-file/browser";
import type { DirectoryListParams } from "./directory-api";

import { fetchDirectory } from "./directory-api";

/**
 * 通讯录 Excel 导出（write-excel-file，阶段 4 + 表格样式美化）。
 *
 * - 库在用户触发导出时才动态 `import()`，不增加通讯录页初始包体积；
 * - 数据获取为「当前筛选条件 → 串行分页请求 → 逐页汇总 → 前端生成 Excel」，
 *   禁止 pageSize 拉满；依赖稳定排序（sort/order 随筛选条件传入）避免翻页漂移；
 * - 数据量保护（超限判断前移，不允许拉完全部数据后才判断）：
 *   · 分页接口返回 total 时，首次请求后优先读 total，超限直接终止（不再请求后续页）；
 *   · 无 total 时分页过程中累计数量，一旦超过上限立即停止后续请求；
 * - 上限第一版按演示规模设 10000 条；未来规模明显扩大再演进服务端文件流导出，
 *   现阶段无后端导出接口（无契约变更）。
 *
 * 表格样式（企业级）：
 * - 全局微软雅黑 11 号（Options），表头品牌蓝底白字加粗 12 号居中；
 * - 数据区斑马纹（偶数行 #F5F7FA / 奇数行 #FFFFFF）+ 浅灰细边框 + 行高 22；
 * - 「在职状态」列按值高亮：在职 #52c41a 加粗 / 离职 #f5222d；
 * - stickyRowsCount: 1 冻结表头首行；
 * - 表头由 columns[].header 生成（objects 只含数据行，见 getSheetData 源码语义），
 *   单元格的值与样式统一由 columns[].cell 回调产出（write-excel-file 4.x API）。
 */

/** 单次导出最大条数 */
export const DIRECTORY_EXPORT_MAX_ROWS = 10000;

/** 串行分页每页条数（后端分页 DTO 白名单最大值 50；上限内最多 200 次请求） */
const EXPORT_PAGE_SIZE = 50;

/** 超限信号：调用方据此展示「缩小筛选范围」提示 */
export class DirectoryExportLimitError extends Error {
  constructor() {
    super("DIRECTORY_EXPORT_LIMIT_EXCEEDED");
    this.name = "DirectoryExportLimitError";
  }
}

/* --------------------------- 样式常量（企业级视觉） --------------------------- */

/** 表头：品牌蓝底 */
const HEADER_BACKGROUND = "#1677FF";
/** 表头：深蓝细边框（同色系加深，区别于数据区浅灰边框） */
const HEADER_BORDER = "#1668DC";
/** 数据区斑马纹：偶数行浅灰 */
const STRIPE_BACKGROUND = "#F5F7FA";
/** 数据区斑马纹：奇数行纯白 */
const PLAIN_BACKGROUND = "#FFFFFF";
/** 数据区边框：浅灰细线 */
const BODY_BORDER = "#D9D9D9";
/** 数据区正文色：深灰（默认由全局 Options 字体色兜底，此处用于状态列外的深灰提示） */
const BODY_TEXT = "#333333";
/** 在职状态：在职（绿、加粗） */
const STATUS_EMPLOYED_COLOR = "#52c41a";
/** 在职状态：离职等（红） */
const STATUS_RESIGNED_COLOR = "#f5222d";
/** 数据行行高（pt） */
const BODY_ROW_HEIGHT = 22;
/** 表头行行高（pt） */
const HEADER_ROW_HEIGHT = 26;

/**
 * 字段定义：标题（i18n 键）+ 列宽（字符）+ 水平对齐；
 * isStatus 标记「在职状态」列（按值高亮着色）。
 */
const FIELD_DEFS: {
  titleKey: string;
  width: number;
  align: "left" | "center";
  isStatus?: boolean;
}[] = [
  { titleKey: "features.directory.column.name", width: 14, align: "left" },
  { titleKey: "features.directory.column.username", width: 12, align: "left" },
  {
    titleKey: "features.directory.column.employeeNo",
    width: 12,
    align: "left",
  },
  { titleKey: "features.directory.column.dept", width: 24, align: "left" },
  { titleKey: "features.directory.column.mainPost", width: 14, align: "left" },
  { titleKey: "features.directory.column.phone", width: 15, align: "left" },
  { titleKey: "features.directory.column.email", width: 24, align: "left" },
  {
    titleKey: "features.directory.column.entryDate",
    width: 12,
    align: "center",
  },
  {
    titleKey: "features.directory.column.status",
    width: 10,
    align: "center",
    isStatus: true,
  },
];

/** 文件名时间戳：YYYYMMDD-HHmmss */
function buildTimestamp(): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const now = new Date();

  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/**
 * 组装列配置（表头样式 + 数据单元格样式回调）。
 *
 * - header：品牌蓝底白字加粗，水平 / 垂直居中，深蓝细边框；
 * - cell：按行索引生成斑马纹背景（偶数行 #F5F7FA / 奇数行 #FFFFFF），
 *   浅灰细边框、垂直居中、行高 22；值取自该行对应列；
 * - 状态列额外按值着色：在职 #52c41a 加粗 / 离职 #f5222d。
 */
function buildColumns(t: TFunction, employedLabel: string): Column<string[]>[] {
  return FIELD_DEFS.map((field, columnIndex) => ({
    width: field.width,
    header: {
      value: t(field.titleKey),
      fontWeight: "bold" as const,
      fontSize: 12,
      textColor: "#FFFFFF",
      backgroundColor: HEADER_BACKGROUND,
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: HEADER_BORDER,
      borderStyle: "thin" as const,
      height: HEADER_ROW_HEIGHT,
    },
    cell: (object: string[], objectIndex: number) => ({
      value: object[columnIndex] ?? "",
      align: field.align,
      alignVertical: "center" as const,
      backgroundColor:
        objectIndex % 2 === 0 ? STRIPE_BACKGROUND : PLAIN_BACKGROUND,
      borderColor: BODY_BORDER,
      borderStyle: "thin" as const,
      height: BODY_ROW_HEIGHT,
      // 数据区正文统一深灰（空值继承同一配色，视觉一致）
      textColor: BODY_TEXT,
      // 「在职状态」列：按值高亮（在职绿粗 / 离职红），覆盖默认深灰
      ...(field.isStatus
        ? {
            fontWeight: "bold" as const,
            textColor:
              object[columnIndex] === employedLabel
                ? STATUS_EMPLOYED_COLOR
                : STATUS_RESIGNED_COLOR,
          }
        : {}),
    }),
  }));
}

/**
 * 按当前筛选条件导出通讯录为 .xlsx，返回导出行数。
 * 超限时抛 DirectoryExportLimitError（不生成文件）。
 */
export async function exportDirectoryExcel(options: {
  /** 当前筛选与排序（page/pageSize 除外，由本函数按批量策略填充） */
  params: Omit<DirectoryListParams, "page" | "pageSize">;
  t: TFunction;
}): Promise<number> {
  const { params, t } = options;

  // 触发导出时才动态加载 write-excel-file 浏览器版（含 fflate）；
  // 4.x 的 exports 无裸 "." 入口，浏览器端须用 write-excel-file/browser
  const { default: writeXlsxFile, getSheetData } = await import(
    "write-excel-file/browser"
  );

  const rows: DirectoryEntry[] = [];
  let total: number | null = null;
  let page = 1;

  while (true) {
    const result = await fetchDirectory({
      ...params,
      page,
      pageSize: EXPORT_PAGE_SIZE,
    });

    if (total === null) {
      // 首次请求后优先读 total：超限立即终止，不继续请求后续页
      const serverTotal = result.pagination?.total;

      if (
        typeof serverTotal === "number" &&
        serverTotal > DIRECTORY_EXPORT_MAX_ROWS
      ) {
        throw new DirectoryExportLimitError();
      }
      total = typeof serverTotal === "number" ? serverTotal : null;
    }
    rows.push(...result.data);
    // 无 total 兜底：分页过程中累计，一旦超限立即停止后续请求
    if (rows.length > DIRECTORY_EXPORT_MAX_ROWS) {
      throw new DirectoryExportLimitError();
    }
    const reachedEnd =
      (total !== null && rows.length >= total) ||
      result.data.length < EXPORT_PAGE_SIZE;

    if (reachedEnd) {
      break;
    }
    page += 1;
  }

  if (rows.length === 0) {
    return 0;
  }

  const employedLabel = t("features.directory.filter.employed");

  // 数据行：纯值数组（表头与单元格的值 / 样式统一由 getSheetData + columns 产出）
  const objectRows = rows.map((row) => [
    row.displayName,
    row.username,
    row.employeeNo ?? "",
    row.deptPath ?? "",
    row.mainPostName ?? "",
    row.phone ?? "",
    row.email ?? "",
    row.entryDate ?? "",
    row.employmentStatus === "employed"
      ? employedLabel
      : t("features.directory.filter.resigned"),
  ]);

  // 关键：4.x 的 writeXlsxFile 不消费 columns.header/cell，必须先经库导出的
  // getSheetData 把 objects 转成 SheetData（自动拼表头行 + 应用单元格样式），
  // 否则表头行不会生成、所有样式丢失（sheetData 行数 = 1 表头 + N 数据）。
  const sheetData = getSheetData(objectRows, buildColumns(t, employedLabel));

  // 全局微软雅黑 11 号；stickyRowsCount: 1 冻结表头首行；
  // 4.x：writeXlsxFile 返回 { toBlob, toFile } 句柄，toFile 触发浏览器下载
  await writeXlsxFile(
    sheetData,
    { stickyRowsCount: 1 },
    {
      fontFamily: "Microsoft YaHei",
      fontSize: 11,
    },
  ).toFile(
    `${t("features.directory.export.fileName")}_${buildTimestamp()}.xlsx`,
  );

  return rows.length;
}
