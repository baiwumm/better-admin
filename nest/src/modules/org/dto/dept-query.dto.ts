import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/org/depts 查询参数（与 openapi.yaml v1.6.0 对齐） */
export class DeptQueryDto {
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

  /** 传则返回该组织的直接下级组织（不含更深层级） */
  @IsOptional()
  @IsString()
  parentId?: string;

  /** 组织名称 / 编码模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
