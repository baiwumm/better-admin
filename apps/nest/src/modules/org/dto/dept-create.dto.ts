import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

/** POST /api/org/depts 请求体（与 DeptCreateRequest 对齐） */
export class DeptCreateDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string | null;

  /** 父级组织 ID；null 表示创建顶级组织 */
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  leaderId?: string | null;

  /** 同级排序号，数字越大越靠前 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  status?: 'enabled' | 'disabled' = 'enabled';
}
