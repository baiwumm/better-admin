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

/** POST /api/dict/types/:code/items 请求体 */
export class DictItemCreateDto {
  @IsString()
  @Length(1, 50)
  value!: string;

  @IsString()
  @Length(1, 20)
  label!: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Matches(/^$|^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/, {
    message: 'i18nKey 须为点分格式，如 dict.user_status.enabled',
  })
  i18nKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number = 0;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
