import { Module } from '@nestjs/common';
import { DeptsController } from './depts.controller';
import { DeptsService } from './depts.service';

/** 组织中心（v1.6.0）：阶段 1 组织管理；阶段 2 追加岗位 / 通讯录 */
@Module({
  controllers: [DeptsController],
  providers: [DeptsService],
})
export class OrgModule {}
