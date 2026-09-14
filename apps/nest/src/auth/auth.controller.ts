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
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.clientMeta(req));
  }

  /** POST /api/auth/refresh */
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
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
  async logout(@Req() req: Request, @Body() dto?: LogoutDto) {
    await this.authService.logout(
      req.user as AuthUser,
      this.clientMeta(req),
      dto?.refreshToken ?? null,
    );
    return;
  }
}
