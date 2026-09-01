import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import {
  DirectoryEntryView,
  collectDeptSubtreeIds,
  loadDirectoryExtras,
  toDirectoryEntryView,
} from './org-views';
import { DirectoryQueryDto } from './dto/directory-query.dto';

/**
 * 人员通讯录（契约 v1.6.0）：全员视图实时联查，无缓存延迟。
 *
 * - 组织筛选含所选组织的全部下级组织人员（递归 CTE）；
 * - 在职状态缺省 employed（离职人员默认不展示，PRD 3.3.5）；
 *   employment_status 为 NULL 的存量数据按在职处理；
 * - 关键词命中 displayName / employeeNo / username（模糊）。
 */
@Injectable()
export class DirectoryService {
  async findAll(query: DirectoryQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(users.deletedAt)];
    switch (query.employmentStatus) {
      case 'resigned':
        conditions.push(eq(users.employmentStatus, 'resigned'));
        break;
      case 'all':
        break;
      // 缺省 employed：显式在职或存量 NULL
      default:
        conditions.push(
          sql`(${users.employmentStatus} IS NULL OR ${users.employmentStatus} = 'employed')`,
        );
        break;
    }
    if (query.deptId) {
      const subtreeIds = await collectDeptSubtreeIds(query.deptId);
      conditions.push(inArray(users.deptId, subtreeIds));
    }
    if (query.keyword) {
      const pattern = `%${query.keyword}%`;
      conditions.push(
        sql`(${users.displayName} ILIKE ${pattern} OR ${users.employeeNo} ILIKE ${pattern} OR ${users.username} ILIKE ${pattern})`,
      );
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(where);

    // 排序白名单避免注入；默认创建时间降序
    const SORTABLE = new Set([
      'username',
      'displayName',
      'employeeNo',
      'entryDate',
      'employmentStatus',
      'createdAt',
    ]);
    const sortCol =
      query.sort && SORTABLE.has(query.sort) ? query.sort : 'createdAt';
    const dir = query.order === 'asc' ? asc : desc;
    const orderBy = dir((users as any)[sortCol]);

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        employeeNo: users.employeeNo,
        phone: users.phone,
        email: users.email,
        entryDate: users.entryDate,
        employmentStatus: users.employmentStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(orderBy, asc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const extrasMap = await loadDirectoryExtras(rows.map((r) => r.id));

    return {
      data: rows.map((row) =>
        toDirectoryEntryView(row, extrasMap.get(row.id)),
      ),
      pagination: { page, pageSize, total },
    } satisfies {
      data: DirectoryEntryView[];
      pagination: { page: number; pageSize: number; total: number };
    };
  }
}
