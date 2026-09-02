import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { dictItems, dictTypes, logs } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 字典服务（与 nest/src/modules/dict/dict.service.ts 一一对齐）。
 * 类型/项均全量返回（契约 v1.4，无分页）；清空可选字段传空串（?? 兜底语义）。
 */

export interface DictTypeView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DictItemView {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  i18nKey: string | null;
  sort: number;
  enabled: boolean;
}

/** 唯一冲突 → 409（postgres.js 的 pg 错误字段为 constraint_name）。 */
function handleUniqueError(error: unknown): never {
  const err = error as {
    constraint_name?: string;
    constraint?: string;
    cause?: { constraint?: string; constraint_name?: string };
  };
  const constraint =
    err?.constraint_name ??
    err?.constraint ??
    err?.cause?.constraint_name ??
    "";

  if (constraint.includes("dict_types_code_unique")) {
    throw new ServerApiError(
      409,
      "DICT_TYPE_CODE_EXISTS",
      "字典类型 code 已存在",
    );
  }
  if (constraint.includes("dict_items_type_value_unique")) {
    throw new ServerApiError(
      409,
      "DICT_ITEM_VALUE_EXISTS",
      "该字典类型下 value 已存在",
    );
  }

  throw new ServerApiError(500, "INTERNAL_ERROR", "服务器内部错误");
}

async function writeLog(
  action: string,
  operatorId: string | null,
  detail?: unknown,
): Promise<void> {
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: "operation",
      userId: operatorId,
      action,
      detail: detail === undefined ? null : detail,
    });
  } catch (err) {
    console.error("[dict] 写入日志失败:", err);
  }
}

function typeToView(row: typeof dictTypes.$inferSelect): DictTypeView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function itemToView(row: typeof dictItems.$inferSelect): DictItemView {
  return {
    id: row.id,
    typeCode: row.typeCode,
    value: row.value,
    label: row.label,
    i18nKey: row.i18nKey,
    sort: row.sort,
    enabled: row.enabled,
  };
}

// ---------------- Dict Types ----------------

/** GET /dict/types — 全量类型列表（按创建时间升序）。 */
export async function listDictTypes(): Promise<DictTypeView[]> {
  const rows = await db
    .select()
    .from(dictTypes)
    .orderBy(asc(dictTypes.createdAt));

  return rows.map(typeToView);
}

async function requireType(code: string): Promise<DictTypeView> {
  const row = await db.query.dictTypes.findFirst({
    where: eq(dictTypes.code, code),
  });

  if (!row) {
    throw new ServerApiError(404, "DICT_TYPE_NOT_FOUND", "字典类型不存在");
  }

  return typeToView(row);
}

/** GET /dict/types/:code — 单类型详情。 */
export async function findDictType(code: string): Promise<DictTypeView> {
  return requireType(code);
}

export interface DictTypeCreateInput {
  code: string;
  name: string;
  description?: string;
}

/** POST /dict/types — 创建（code 唯一，创建后不可改）。 */
export async function createDictType(
  dto: DictTypeCreateInput,
  operatorId: string | null,
): Promise<DictTypeView> {
  let row: typeof dictTypes.$inferSelect;

  try {
    const inserted = await db
      .insert(dictTypes)
      .values({
        id: generateRecordId(),
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
      })
      .returning();

    row = inserted[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dict_type.create", operatorId, { code: row.code });

  return typeToView(row);
}

export interface DictTypeUpdateInput {
  name?: string;
  description?: string;
}

/** PUT /dict/types/:code — 更新（description 传空串清空）。 */
export async function updateDictType(
  code: string,
  dto: DictTypeUpdateInput,
  operatorId: string | null,
): Promise<DictTypeView> {
  const existing = await requireType(code);

  let row: typeof dictTypes.$inferSelect;

  try {
    const updated = await db
      .update(dictTypes)
      .set({
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(dictTypes.code, code))
      .returning();

    row = updated[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dict_type.update", operatorId, { code });

  return typeToView(row);
}

/** DELETE /dict/types/:code — 有字典项引用则 409 DICT_TYPE_IN_USE。 */
export async function removeDictType(
  code: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await requireType(code);

  const [{ count: itemCount }] = await db
    .select({ count: count() })
    .from(dictItems)
    .where(eq(dictItems.typeCode, code));

  if (itemCount > 0) {
    throw new ServerApiError(
      409,
      "DICT_TYPE_IN_USE",
      "该字典类型下仍有字典项，无法删除",
    );
  }

  await db.delete(dictTypes).where(eq(dictTypes.code, code));

  await writeLog("dict_type.delete", operatorId, { code });

  return null;
}

// ---------------- Dict Items ----------------

/** GET /dict/types/:code/items — 该类型下全量字典项（sort 升序）。 */
export async function listDictItems(typeCode: string): Promise<DictItemView[]> {
  await requireType(typeCode);

  const rows = await db
    .select()
    .from(dictItems)
    .where(eq(dictItems.typeCode, typeCode))
    .orderBy(asc(dictItems.sort), asc(dictItems.createdAt));

  return rows.map(itemToView);
}

export interface DictItemCreateInput {
  value: string;
  label: string;
  i18nKey?: string;
  sort?: number;
  enabled?: boolean;
}

/** POST /dict/types/:code/items — 创建字典项（类型下 value 唯一）。 */
export async function createDictItem(
  typeCode: string,
  dto: DictItemCreateInput,
  operatorId: string | null,
): Promise<DictItemView> {
  await requireType(typeCode);

  let row: typeof dictItems.$inferSelect;

  try {
    const inserted = await db
      .insert(dictItems)
      .values({
        id: generateRecordId(),
        typeCode,
        value: dto.value,
        label: dto.label,
        i18nKey: dto.i18nKey ?? null,
        sort: dto.sort ?? 0,
        enabled: dto.enabled ?? true,
      })
      .returning();

    row = inserted[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dict_item.create", operatorId, {
    typeCode,
    value: row.value,
  });

  return itemToView(row);
}

export interface DictItemUpdateInput {
  value?: string;
  label?: string;
  i18nKey?: string;
  sort?: number;
  enabled?: boolean;
}

/** PUT /dict/items/:id — 更新字典项。 */
export async function updateDictItem(
  id: string,
  dto: DictItemUpdateInput,
  operatorId: string | null,
): Promise<DictItemView> {
  const existing = await db.query.dictItems.findFirst({
    where: eq(dictItems.id, id),
  });

  if (!existing) {
    throw new ServerApiError(404, "DICT_ITEM_NOT_FOUND", "字典项不存在");
  }

  let row: typeof dictItems.$inferSelect;

  try {
    const updated = await db
      .update(dictItems)
      .set({
        value: dto.value ?? existing.value,
        label: dto.label ?? existing.label,
        i18nKey: dto.i18nKey ?? existing.i18nKey,
        sort: dto.sort ?? existing.sort,
        enabled: dto.enabled ?? existing.enabled,
      })
      .where(eq(dictItems.id, id))
      .returning();

    row = updated[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("dict_item.update", operatorId, { id });

  return itemToView(row);
}

/** DELETE /dict/items/:id — 删除字典项。 */
export async function removeDictItem(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.dictItems.findFirst({
    where: eq(dictItems.id, id),
  });

  if (!existing) {
    throw new ServerApiError(404, "DICT_ITEM_NOT_FOUND", "字典项不存在");
  }

  await db.delete(dictItems).where(eq(dictItems.id, id));

  await writeLog("dict_item.delete", operatorId, { id });

  return null;
}
