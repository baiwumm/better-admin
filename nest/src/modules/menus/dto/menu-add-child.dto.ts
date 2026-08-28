import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * POST /api/menus/:id/add-child 请求体。
 * parentId 由路径 :id 决定，不在请求体中提供。
 */
export class AddChildDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  i18nKey?: string;

  @IsString()
  icon!: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number = 0;

  @IsOptional()
  @IsBoolean()
  keepAlive?: boolean = false;

  @IsOptional()
  @IsBoolean()
  hideInMenu?: boolean = false;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  defaultOpen?: boolean = false;


  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/, { message: 'permissions 必须为整数位掩码' })
  permissions?: string = '0';
}
