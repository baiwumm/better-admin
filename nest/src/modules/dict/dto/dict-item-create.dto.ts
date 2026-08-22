import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** POST /api/dict/types/:code/items 请求体 */
export class DictItemCreateDto {
  @IsString()
  value!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
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
