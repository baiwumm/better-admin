import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/logs 查询参数（与 openapi.yaml 对齐） */
export class LogQueryDto {
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
  @IsIn(['operation', 'login', 'api', 'error'])
  type?: 'operation' | 'login' | 'api' | 'error';

  @IsOptional()
  @IsString()
  search?: string;
}
