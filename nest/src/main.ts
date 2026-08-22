// 必须在业务模块（含 db/client）之前加载 .env：import 按声明顺序求值，
// dotenv/config 置顶确保 DATABASE_URL / JWT_SECRET 对后续所有模块可见。
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadConfig } from './config/env';

async function bootstrap() {
  // 启动期环境变量校验：缺失 DATABASE_URL / JWT_SECRET 时显式报错
  loadConfig();

  const app = await NestFactory.create(AppModule);

  // 全局前缀 /api（与 openapi.yaml servers 路径前缀一致）
  app.setGlobalPrefix('api');

  // CORS：允许本地开发前端与生产前端域名（可通过 CORS_ORIGINS 环境变量覆盖）
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://react.baiwumm.com',
        'https://vue.baiwumm.com',
      ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger 文档（挂在 /docs，与 openapi-design.md §6 约定一致）
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Better Admin API')
    .setDescription('Better Admin Phase 2 (NestJS + PostgreSQL) API Contract')
    .setVersion('1.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
   
  console.log(
    `[nest] Better Admin API listening on http://localhost:${port}/api , Swagger on http://localhost:${port}/docs`,
  );
}

bootstrap();
