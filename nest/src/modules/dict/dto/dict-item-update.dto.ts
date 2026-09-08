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

/** PUT /api/dict/items/:id 请求体 */
export class DictItemUpdateDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  value?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Matches(I18N_KEY_PATTERN, {
    message: 'i18nKey 须为点分格式，如 dict.user_status.enabled',
  })
  i18nKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
