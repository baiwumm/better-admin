import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/notices 查询参数（管理列表，与 openapi.yaml v1.7.0 对齐） */
export class NoticeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 30, 40, 50])
  pageSize?: number = 10;

  /** 标题模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'withdrawn'])
  status?: 'draft' | 'published' | 'withdrawn';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

/** GET /api/notices/mine 查询参数（我的公告） */
export class NoticeMineQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 30, 40, 50])
  pageSize?: number = 10;

  /** 标题模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string;

  /** 阅读状态筛选：all 缺省，read / unread 为个人维度 */
  @IsOptional()
  @IsIn(['all', 'read', 'unread'])
  readStatus?: 'all' | 'read' | 'unread' = 'all';
}

/** GET /api/notices/:id/read-stats 查询参数 */
export class NoticeReadStatsQueryDto {
  @IsIn(['read', 'unread'])
  status!: 'read' | 'unread';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 30, 40, 50])
  pageSize?: number = 10;
}
