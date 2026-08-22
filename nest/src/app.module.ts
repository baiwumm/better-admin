import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { MenusModule } from './modules/menus/menus.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { DictModule } from './modules/dict/dict.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LogsModule } from './modules/logs/logs.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * 根模块（Phase 2 基础设施阶段）。
 * 已接入：全局异常过滤器、全局响应拦截器、API 日志拦截器、ValidationPipe、
 * Auth / Users / Roles / Menus / Permissions / Dict / Settings / Logs 模块。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    RolesModule,
    MenusModule,
    PermissionsModule,
    DictModule,
    SettingsModule,
    LogsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
