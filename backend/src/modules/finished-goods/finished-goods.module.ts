import { Module } from '@nestjs/common';
import { FinishedGoodsService } from './finished-goods.service';
import { FinishedGoodsController } from './finished-goods.controller';

@Module({
  controllers: [FinishedGoodsController],
  providers: [FinishedGoodsService],
  exports: [FinishedGoodsService],
})
export class FinishedGoodsModule {}
