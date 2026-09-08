import { IsOptional, IsString, Length, Matches } from 'class-validator';

/** POST /api/dict/types 请求体 */
export class DictTypeCreateDto {
  @IsString()
  @Length(1, 50)
  @Matches(/^[A-Za-z][A-Za-z0-9_-]*$/, {
    message: 'code 必须以字母开头，仅含字母、数字、下划线、中划线',
  })
  code!: string;

  @IsString()
  @Length(1, 20)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;
}
