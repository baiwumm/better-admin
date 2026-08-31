import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

/** PUT /api/account/profile 请求体（自助修改基本信息，字段缺省表示不修改） */
export class UpdateAccountProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  displayName?: string;

  /** 电话，可传 null 清空；允许 + 前缀与数字、空格、短横线，4-20 位 */
  @IsOptional()
  @Matches(/^\+?[0-9][0-9\- ]{3,19}$/, {
    message: '电话格式不正确',
  })
  phone?: string | null;

  /** 个人标签全量替换；服务端逐项 trim、去空、去重（超限 400 VALIDATION_ERROR） */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];
}

/** PUT /api/account/email 请求体（需当前密码确认） */
export class UpdateAccountEmailDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(1)
  currentPassword!: string;
}

/** PUT /api/account/password 请求体（成功后 tokenVersion+1 全端强制下线） */
export class UpdateAccountPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
