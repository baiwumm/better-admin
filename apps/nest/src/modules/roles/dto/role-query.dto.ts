import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/roles 查询参数 */
export class RoleQueryDto {
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

  @IsOptional()
  @IsString()
  search?: string;

  /** 状态筛选（字符串布尔，缺省返回全部） */
  @IsOptional()
  @IsIn(['true', 'false'])
  enabled?: 'true' | 'false';
}
