import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AvatarStorageService } from './avatar-storage.service';

/** 我的账户模块（v1.5.0 自助接口：资料 / 邮箱 / 密码 / 头像） */
@Module({
  controllers: [AccountController],
  providers: [AccountService, AvatarStorageService],
})
export class AccountModule {}
