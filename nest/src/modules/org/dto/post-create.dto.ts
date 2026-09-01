import { IsIn, IsOptional, IsString, Length } from 'class-validator';

/** POST /api/org/posts 请求体（与 PostCreateRequest 对齐） */
export class PostCreateDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  deptId!: string;

  @IsIn(['management', 'professional', 'production'])
  category!: 'management' | 'professional' | 'production';

  /** 岗位职级（P1-P10 / M1-M5），空串表示未设置 */
  @IsOptional()
  @IsString()
  @Length(0, 20)
  rank?: string;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled' = 'enabled';
}
