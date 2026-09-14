import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/notifications 查询参数（与 openapi.yaml v1.7.0 对齐；v1.7.1 补 DTO 校验） */
export class NotificationQueryDto {
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

  /** 仅看未读（query 以字符串布尔传输，与 roles enabled 筛选同风格） */
  @IsOptional()
  @IsIn(['true', 'false'])
  unreadOnly?: 'true' | 'false';
}
