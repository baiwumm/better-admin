import { IsIn, IsOptional, IsString, Length } from 'class-validator';

/** PUT /api/org/posts/:id 请求体（与 PostUpdateRequest 对齐；字段缺省表示不修改） */
export class PostUpdateDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  deptId?: string;

  @IsOptional()
  @IsIn(['management', 'professional', 'production'])
  category?: 'management' | 'professional' | 'production';

  @IsOptional()
  @IsString()
  @Length(0, 20)
  rank?: string;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled';
}
