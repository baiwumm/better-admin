import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AccountService } from './account.service';
import {
  UpdateAccountEmailDto,
  UpdateAccountPasswordDto,
  UpdateAccountProfileDto,
} from './dto/account.dto';
import { AuthUser } from '../auth/auth.service';

/**
 * 我的账户（v1.5.0 自助模块）：仅挂 AuthGuard('jwt')，不走 PermissionsGuard ——
 * 自助操作不依赖权限位（管理端 /users 的类级 guard 对本人操作不适用）。
 */
@Controller('account')
@UseGuards(AuthGuard('jwt'))
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  private userId(req: Request): string {
    return (req.user as AuthUser)?.id;
  }

  /** GET /api/account/profile */
  @Get('profile')
  getProfile(@Req() req: Request) {
    return this.accountService.getProfile(this.userId(req));
  }

  /** PUT /api/account/profile（displayName / phone / tags） */
  @Put('profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateAccountProfileDto) {
    return this.accountService.updateProfile(this.userId(req), dto);
  }

  /** PUT /api/account/email（需当前密码确认，冲突 409 EMAIL_EXISTS） */
  @Put('email')
  updateEmail(@Req() req: Request, @Body() dto: UpdateAccountEmailDto) {
    return this.accountService.updateEmail(this.userId(req), dto);
  }

  /** PUT /api/account/password（成功后全端强制下线，data 为 null） */
  @Put('password')
  @HttpCode(200)
  async updatePassword(
    @Req() req: Request,
    @Body() dto: UpdateAccountPasswordDto,
  ) {
    return this.accountService.updatePassword(this.userId(req), dto);
  }

  /**
   * POST /api/account/avatar（multipart，字段名 file）。
   * multer 默认内存存储，limits.fileSize 在读入内存前拦截超大请求
   * （业务侧 2MB 白名单/大小校验由 AvatarStorageService 兜底），
   * buffer 直接交由 AvatarStorageService 中转上传 Supabase Storage。
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  updateAvatar(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'AVATAR_FILE_INVALID',
        message: '未提供头像文件',
      });
    }
    return this.accountService.updateAvatar(this.userId(req), file);
  }

  /** DELETE /api/account/avatar（删除头像：置空并尽力清理 Storage 对象，v1.5.1） */
  @Delete('avatar')
  deleteAvatar(@Req() req: Request) {
    return this.accountService.deleteAvatar(this.userId(req));
  }
}
