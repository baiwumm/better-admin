import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 拖拽排序单项：id + 移动后 parentId（null = 顶级）+ 移动后 sort */
export class DeptSortItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;
}

/** PATCH /api/org/depts/sort 请求体（与 DeptSortRequest 对齐） */
export class DeptSortDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeptSortItemDto)
  items!: DeptSortItemDto[];
}
