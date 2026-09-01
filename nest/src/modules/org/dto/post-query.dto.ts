import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/org/posts 查询参数（与 openapi.yaml v1.6.0 对齐） */
export class PostQueryDto {
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

  /** 按所属组织筛选（含其全部下级组织的岗位） */
  @IsOptional()
  @IsString()
  deptId?: string;

  /** 岗位名称模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['management', 'professional', 'production'])
  category?: 'management' | 'professional' | 'production';

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

/** GET /api/org/posts/:id/members 查询参数（在职人数穿透） */
export class PostMembersQueryDto {
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
