import { IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * PUT /api/org/depts/:id 请求体（与 DeptUpdateRequest 对齐）。
 * parentId 语义：undefined = 不修改父级；null = 移动为顶级组织；
 * 非 null = 移动到该组织下（服务端防环校验）。
 */
export class DeptUpdateDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  leaderId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
}
