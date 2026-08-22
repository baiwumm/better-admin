import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { settings, logs } from '../../db/schema';
import { SettingQueryDto } from './dto/setting-query.dto';
import { SettingUpdateDto } from './dto/setting-update.dto';

export type SettingView = {
  key: string;
  value: unknown;
  group: string;
  description: string | null;
};

/**
 * 预置设置项的 key → 期望 value 类型注册表（与 database-design.md §4 对齐）。
 * 用于 PUT 更新时的类型校验。新增预置 key 时在此登记即可。
 */
const SETTING_TYPE_REGISTRY: Record<string, 'string' | 'number' | 'boolean'> = {
  'site.title': 'string',
  'site.logo': 'string',
  'site.description': 'string',
  'user.allowRegister': 'boolean',
  'user.passwordExpireDays': 'number',
  'theme.primary': 'string',
  'theme.darkMode': 'string',
  'system.logRetentionDays': 'number',
};

function expectedType(key: string): 'string' | 'number' | 'boolean' | null {
  return SETTING_TYPE_REGISTRY[key] ?? null;
}

function actualType(value: unknown): 'string' | 'number' | 'boolean' | 'object' | 'other' {
  if (value === null) return 'object';
  if (Array.isArray(value)) return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'other';
}

@Injectable()
export class SettingsService {
  private async writeLog(action: string, operatorId: string | null, detail?: unknown) {
    try {
      await db.insert(logs).values({
        type: 'operation',
        action,
        userId: operatorId,
        detail: detail === undefined ? null : (detail as any),
      });
    } catch (err) {
       
      console.error('[settings] 写入日志失败:', err);
    }
  }

  async list(query: SettingQueryDto) {
    const rows = query.group
      ? await db.select().from(settings).where(eq(settings.group, query.group))
      : await db.select().from(settings);
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      group: r.group,
      description: r.description,
    }));
  }

  async getByKey(key: string) {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (!row) {
      throw new NotFoundException({
        code: 'SETTING_NOT_FOUND',
        message: '设置项不存在',
      });
    }
    return {
      key: row.key,
      value: row.value,
      group: row.group,
      description: row.description,
    };
  }

  async update(key: string, dto: SettingUpdateDto, operatorId: string | null) {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (!row) {
      throw new NotFoundException({
        code: 'SETTING_NOT_FOUND',
        message: '设置项不存在',
      });
    }

    // 类型校验：若 key 在注册表中，要求 value 类型匹配
    const exp = expectedType(key);
    if (exp) {
      const act = actualType(dto.value);
      if (act !== exp) {
        throw new BadRequestException({
          code: 'INVALID_OPERATION',
          message: `设置项 ${key} 的值类型应为 ${exp}，实际为 ${act}`,
        });
      }
    }

    const before = row.value;
    const [updated] = await db
      .update(settings)
      .set({ value: dto.value as any })
      .where(eq(settings.key, key))
      .returning();

    await this.writeLog('setting.update', operatorId, {
      key,
      before,
      after: updated.value,
    });

    return {
      key: updated.key,
      value: updated.value,
      group: updated.group,
      description: updated.description,
    };
  }
}
