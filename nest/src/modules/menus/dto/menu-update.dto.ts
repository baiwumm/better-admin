import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { I18N_KEY_PATTERN } from '@/lib/constants';

/** PUT /api/menus/:id 请求体 */
export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Matches(I18N_KEY_PATTERN, {
    message: 'i18nKey 须为点分格式，如 menu.system',
  })
  i18nKey?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  icon?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  to?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  keepAlive?: boolean;

  @IsOptional()
  @IsBoolean()
  hideInMenu?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultOpen?: boolean;


  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/, { message: 'permissions 必须为整数位掩码' })
  permissions?: string;
}
