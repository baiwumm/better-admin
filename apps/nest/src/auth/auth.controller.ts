import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, AuthUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { DemoLoginDto } from './dto/demo-login.dto';
import { DemoAllowed } from './decorators/demo-allowed.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private clientMeta(req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string) ?? null;
    return { ip, userAgent };
  }

  /** POST /api/auth/login（契约 200，@HttpCode 覆盖 Nest POST 默认 201） */
  @Post('login')
  @HttpCode(200)
  @DemoAllowed()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.clientMeta(req));
  }

  /** POST /api/auth/refresh */
  @Post('refresh')
  @HttpCode(200)
  @DemoAllowed()
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  /**
   * POST /api/auth/demo-login（契约 v1.10.0）：演示快捷登录。
   * DEMO_MODE=true 时按 kind 签发演示账号会话（响应结构同 /auth/login）；
   * 关闭时 404，本地开发无感。免鉴权、不接触密码，超管永不进池。
   */
  @Post('demo-login')
  @HttpCode(200)
  @DemoAllowed()
  async demoLogin(@Body() dto: DemoLoginDto, @Req() req: Request) {
    return this.authService.demoLogin(dto.kind, this.clientMeta(req));
  }

  /** GET /api/auth/me */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: Request) {
    return (req.user as AuthUser) ?? null;
  }

  /**
   * POST /api/auth/logout（强制鉴权，撤销托管 refreshToken，记录登出日志，返回 204）。
   * body 可选：带 refreshToken 精确撤销本设备；不带则撤销该用户全部会话。
   */
  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'))
  @DemoAllowed()
  async logout(@Req() req: Request, @Body() dto?: LogoutDto) {
    await this.authService.logout(
      req.user as AuthUser,
      this.clientMeta(req),
      dto?.refreshToken ?? null,
    );
    return;
  }
}
