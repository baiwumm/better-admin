import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { dictTypes, dictItems, logs } from '../../db/schema';
import { DictTypeCreateDto } from './dto/dict-type-create.dto';
import { DictTypeUpdateDto } from './dto/dict-type-update.dto';
import { DictItemCreateDto } from './dto/dict-item-create.dto';
import { DictItemUpdateDto } from './dto/dict-item-update.dto';

export type DictTypeView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DictItemView = {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  i18nKey: string | null;
  sort: number;
  enabled: boolean;
};

@Injectable()
export class DictService {
  private handleUniqueError(err: any): never {
    // drizzle 0.45 将 pg 错误包装为 DrizzleQueryError，原始错误的 constraint 挂在 cause 上
    const constraint: string = err?.constraint ?? err?.cause?.constraint ?? '';
    if (constraint.includes('dict_types_code_unique')) {
      throw new ConflictException({
        code: 'DICT_TYPE_CODE_EXISTS',
        message: '字典类型 code 已存在',
      });
    }
    if (constraint.includes('dict_items_type_value_unique')) {
      throw new ConflictException({
        code: 'DICT_ITEM_VALUE_EXISTS',
        message: '该字典类型下 value 已存在',
      });
    }
    if (constraint.includes('dict_items_type_label_unique')) {
      throw new ConflictException({
        code: 'DICT_ITEM_LABEL_EXISTS',
        message: '该字典类型下 label 已存在',
      });
    }
    throw err;
  }

  private async writeLog(action: string, operatorId: string | null, detail?: unknown) {
    try {
      await db.insert(logs).values({
        type: 'operation',
        action,
        userId: operatorId,
        detail: detail === undefined ? null : (detail as any),
      });
    } catch (err) {
       
      console.error('[dict] 写入日志失败:', err);
    }
  }

  // ---------------- Dict Types ----------------
  async listTypes() {
    const rows = await db
      .select()
      .from(dictTypes)
      .orderBy(dictTypes.createdAt);
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async getType(code: string) {
    const row = await db.query.dictTypes.findFirst({ where: eq(dictTypes.code, code) });
    if (!row) {
      throw new NotFoundException({
        code: 'DICT_TYPE_NOT_FOUND',
        message: '字典类型不存在',
      });
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createType(dto: DictTypeCreateDto, operatorId: string | null) {
    try {
      const [row] = await db
        .insert(dictTypes)
        .values({
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
        })
        .returning();
      await this.writeLog('dict_type.create', operatorId, { code: row.code });
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async updateType(code: string, dto: DictTypeUpdateDto, operatorId: string | null) {
    const existing = await db.query.dictTypes.findFirst({ where: eq(dictTypes.code, code) });
    if (!existing) {
      throw new NotFoundException({
        code: 'DICT_TYPE_NOT_FOUND',
        message: '字典类型不存在',
      });
    }
    try {
      const [row] = await db
        .update(dictTypes)
        .set({
          name: dto.name ?? existing.name,
          // === undefined 判别：允许传 null 清空（契约 nullable；与 depts/posts 惯例一致）
          description:
            dto.description !== undefined ? dto.description : existing.description,
        })
        .where(eq(dictTypes.code, code))
        .returning();
      await this.writeLog('dict_type.update', operatorId, { code });
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async deleteType(code: string, operatorId: string | null) {
    const existing = await db.query.dictTypes.findFirst({ where: eq(dictTypes.code, code) });
    if (!existing) {
      throw new NotFoundException({
        code: 'DICT_TYPE_NOT_FOUND',
        message: '字典类型不存在',
      });
    }
    // 检查是否有字典项引用
    const [{ cnt }] = await db
      .select({ cnt: count() })
      .from(dictItems)
      .where(eq(dictItems.typeCode, code));
    if (cnt > 0) {
      throw new ConflictException({
        code: 'DICT_TYPE_IN_USE',
        message: '该字典类型下仍有字典项，无法删除',
      });
    }
    await db.delete(dictTypes).where(eq(dictTypes.code, code));
    await this.writeLog('dict_type.delete', operatorId, { code });
    return null;
  }

  // ---------------- Dict Items ----------------
  async listItems(typeCode: string) {
    const type = await db.query.dictTypes.findFirst({ where: eq(dictTypes.code, typeCode) });
    if (!type) {
      throw new NotFoundException({
        code: 'DICT_TYPE_NOT_FOUND',
        message: '字典类型不存在',
      });
    }
    const rows = await db
      .select()
      .from(dictItems)
      .where(eq(dictItems.typeCode, typeCode))
      .orderBy(dictItems.sort, dictItems.createdAt);
    return rows.map((r) => ({
      id: r.id,
      typeCode: r.typeCode,
      value: r.value,
      label: r.label,
      i18nKey: r.i18nKey,
      sort: r.sort,
      enabled: r.enabled,
    }));
  }

  async createItem(typeCode: string, dto: DictItemCreateDto, operatorId: string | null) {
    const type = await db.query.dictTypes.findFirst({ where: eq(dictTypes.code, typeCode) });
    if (!type) {
      throw new NotFoundException({
        code: 'DICT_TYPE_NOT_FOUND',
        message: '字典类型不存在',
      });
    }
    try {
      const [row] = await db
        .insert(dictItems)
        .values({
          typeCode,
          value: dto.value,
          label: dto.label,
          i18nKey: dto.i18nKey ?? null,
          sort: dto.sort ?? 0,
          enabled: dto.enabled ?? true,
        })
        .returning();
      await this.writeLog('dict_item.create', operatorId, { typeCode, value: row.value });
      return {
        id: row.id,
        typeCode: row.typeCode,
        value: row.value,
        label: row.label,
        i18nKey: row.i18nKey,
        sort: row.sort,
        enabled: row.enabled,
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async updateItem(id: string, dto: DictItemUpdateDto, operatorId: string | null) {
    const existing = await db.query.dictItems.findFirst({ where: eq(dictItems.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'DICT_ITEM_NOT_FOUND',
        message: '字典项不存在',
      });
    }
    try {
      const [row] = await db
        .update(dictItems)
        .set({
          value: dto.value ?? existing.value,
          label: dto.label ?? existing.label,
          // === undefined 判别：允许传 null 清空（契约 nullable；与 depts/posts 惯例一致）
          i18nKey: dto.i18nKey !== undefined ? dto.i18nKey : existing.i18nKey,
          sort: dto.sort ?? existing.sort,
          enabled: dto.enabled ?? existing.enabled,
        })
        .where(eq(dictItems.id, id))
        .returning();
      await this.writeLog('dict_item.update', operatorId, { id });
      return {
        id: row.id,
        typeCode: row.typeCode,
        value: row.value,
        label: row.label,
        i18nKey: row.i18nKey,
        sort: row.sort,
        enabled: row.enabled,
      };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async deleteItem(id: string, operatorId: string | null) {
    const existing = await db.query.dictItems.findFirst({ where: eq(dictItems.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'DICT_ITEM_NOT_FOUND',
        message: '字典项不存在',
      });
    }
    await db.delete(dictItems).where(eq(dictItems.id, id));
    await this.writeLog('dict_item.delete', operatorId, { id });
    return null;
  }
}
