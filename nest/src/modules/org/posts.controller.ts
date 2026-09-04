import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PostsService, PostView } from './posts.service';
import { PostCreateDto } from './dto/post-create.dto';
import { PostUpdateDto } from './dto/post-update.dto';
import { PostMembersQueryDto, PostQueryDto } from './dto/post-query.dto';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AuthUser } from '../../auth/auth.service';

/** 岗位管理（契约 v1.6.0）：岗位仅作组织数据，不参与权限聚合 */
@Controller('org/posts')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  private operatorId(req: Request): string | null {
    return (req.user as AuthUser)?.id ?? null;
  }

  /** GET /api/org/posts */
  @Get()
  @Permissions('SEARCH')
  findAll(@Query() query: PostQueryDto) {
    return this.postsService.findAll(query);
  }

  /** POST /api/org/posts */
  @Post()
  @HttpCode(200)
  @Permissions('ADD')
  create(@Body() dto: PostCreateDto, @Req() req: Request): Promise<PostView> {
    return this.postsService.create(dto, this.operatorId(req));
  }

  /** GET /api/org/posts/:id/members（在职人数穿透；静态路由声明在 :id 之前） */
  @Get(':id/members')
  @Permissions('SEARCH')
  findMembers(
    @Param('id') id: string,
    @Query() query: PostMembersQueryDto,
  ) {
    return this.postsService.findMembers(id, query);
  }

  /** GET /api/org/posts/:id */
  @Get(':id')
  @Permissions('SEARCH')
  findOne(@Param('id') id: string): Promise<PostView> {
    return this.postsService.findOne(id);
  }

  /** PUT /api/org/posts/:id */
  @Put(':id')
  @Permissions('EDIT')
  update(
    @Param('id') id: string,
    @Body() dto: PostUpdateDto,
    @Req() req: Request,
  ): Promise<PostView> {
    return this.postsService.update(id, dto, this.operatorId(req));
  }

  /** DELETE /api/org/posts/:id */
  @Delete(':id')
  @Permissions('DELETE')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.postsService.remove(id, this.operatorId(req));
  }
}
