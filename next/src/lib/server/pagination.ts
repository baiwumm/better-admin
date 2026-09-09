import "server-only";

import { ServerApiError } from "@/lib/server/http";

/** 列表分页 pageSize 白名单（对齐 nest 各列表 DTO 的 @IsIn([10,20,30,40,50])） */
const PAGE_SIZES = [10, 20, 30, 40, 50];

export interface PagingParams {
  page?: number;
  pageSize?: number;
  order?: string;
}

/**
 * 校验并归一分页参数（对齐 nest 列表 DTO：非法值一律 400 VALIDATION_ERROR，
 * 不做静默钳制 / 回落）：
 * - page 必须为 ≥1 整数（nest @Min(1)）；
 * - pageSize 必须在白名单内（nest @IsIn）；
 * - withOrder 时 order 仅接受 asc/desc（nest @IsIn），缺省 desc
 *   （nest service 侧 dir = order === 'asc' ? asc : desc，缺省即降序）。
 */
export function normalizePaging(
  params: PagingParams,
  options: { withOrder?: boolean } = {},
): { page: number; pageSize: number; order?: "asc" | "desc" } {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;

  if (!Number.isInteger(page) || page < 1) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "page 必须是大于 0 的整数",
    );
  }
  if (!(PAGE_SIZES as readonly number[]).includes(pageSize)) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      `pageSize 仅支持 ${PAGE_SIZES.join(" / ")}`,
    );
  }

  if (!options.withOrder) {
    return { page, pageSize };
  }

  if (
    params.order !== undefined &&
    params.order !== "asc" &&
    params.order !== "desc"
  ) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "order 仅支持 asc / desc",
    );
  }

  return { page, pageSize, order: params.order ?? "desc" };
}
