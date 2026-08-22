import { IsIn, IsOptional } from 'class-validator';

/** GET /api/settings 查询参数（按 group 过滤） */
export class SettingQueryDto {
  @IsOptional()
  @IsIn(['basic', 'user', 'theme', 'system'])
  group?: 'basic' | 'user' | 'theme' | 'system';
}
