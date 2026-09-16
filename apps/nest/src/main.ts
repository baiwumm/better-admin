// 必须在业务模块（含 db/client）之前加载 .env：import 按声明顺序求值，
// dotenv/config 置顶确保 DATABASE_URL / JWT_SECRET 对后续所有模块可见。
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
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
        'http://localhost:5174',
        'http://localhost:4173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3100',
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

  // API 文档：/docs 挂 Scalar API Reference（UI），/docs-json 保留 OpenAPI JSON 出口
  // （契约运行时出口不变；@nestjs/swagger 仅负责文档生成，UI 由 Scalar 承担）
  // 版本号与 openapi.yaml info.version 保持同步（契约唯一事实来源）
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Better Admin API')
    .setDescription('Better Admin Phase 2 (NestJS + PostgreSQL) API Contract')
    .setVersion('1.10.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerUiEnabled: false,
    jsonDocumentUrl: '/docs-json',
  });
  app.use(
    '/docs',
    apiReference({
      url: '/docs-json',
      pageTitle: 'Better Admin API',
      theme: 'alternate'
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(
    `[nest] Better Admin API listening on http://localhost:${port}/api , API Docs on http://localhost:${port}/docs`,
  );
}

bootstrap();
