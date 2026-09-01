import { Module } from '@nestjs/common';
import { DeptsController } from './depts.controller';
import { DeptsService } from './depts.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';

/** 组织中心（v1.6.0）：阶段 1 组织管理；阶段 2 岗位管理 + 人员通讯录 */
@Module({
  controllers: [DeptsController, PostsController, DirectoryController],
  providers: [DeptsService, PostsService, DirectoryService],
})
export class OrgModule {}
