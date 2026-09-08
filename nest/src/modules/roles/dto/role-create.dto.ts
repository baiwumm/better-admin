import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** POST /api/roles 请求体 */
export class CreateRoleDto {
  @IsString()
  @MaxLength(20)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number = 0;
}
