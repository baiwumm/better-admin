import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { MenusModule } from './modules/menus/menus.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { DictModule } from './modules/dict/dict.module';
import { LogsModule } from './modules/logs/logs.module';
import { OrgModule } from './modules/org/org.module';
import { NoticeModule } from './modules/notice/notice.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DemoReadonlyGuard } from './auth/guards/demo-readonly.guard';

/**
 * 根模块（Phase 2 基础设施阶段）。
 * 已接入：全局异常过滤器、全局响应拦截器、API 日志拦截器、演示只读守卫（DEMO_MODE）、
 * ValidationPipe、Auth / Users / Roles / Menus / Permissions / Dict / Logs 模块。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 定时任务基础设施（消费者：日志清理 LogCleanupService、refresh_tokens 清理 RefreshTokenCleanupService）
    ScheduleModule.forRoot(),
    AuthModule,
    AccountModule,
    UsersModule,
    RolesModule,
    MenusModule,
    PermissionsModule,
    DictModule,
    LogsModule,
    OrgModule,
    NoticeModule,
  ],
  controllers: [],
  providers: [
    // 演示只读守卫（契约 v1.10.0）：全局注册，DEMO_MODE=true 时拦所有非白名单非 GET
    { provide: APP_GUARD, useClass: DemoReadonlyGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
