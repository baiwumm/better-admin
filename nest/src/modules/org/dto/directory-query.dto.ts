import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** GET /api/org/directory 查询参数（与 openapi.yaml v1.6.0 对齐） */
export class DirectoryQueryDto {
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

  /** 按组织筛选（该组织及全部下级组织的人员） */
  @IsOptional()
  @IsString()
  deptId?: string;

  /** 姓名 / 工号 / 登录名模糊搜索 */
  @IsOptional()
  @IsString()
  keyword?: string;

  /** 在职状态筛选；缺省 employed（离职人员默认不展示） */
  @IsOptional()
  @IsIn(['employed', 'resigned', 'all'])
  employmentStatus?: 'employed' | 'resigned' | 'all' = 'employed';

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
