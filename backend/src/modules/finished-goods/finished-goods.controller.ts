import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FinishedGoodsService } from './finished-goods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('finished-goods')
export class FinishedGoodsController {
  constructor(private readonly finishedGoodsService: FinishedGoodsService) {}

  @Get('stock')
  getStock(@GetTenant('id') tenantId: string) {
    return this.finishedGoodsService.getStock(tenantId);
  }

  @Post('stock/:productId/adjust')
  adjustStock(
    @GetTenant('id') tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    return this.finishedGoodsService.adjustStock(tenantId, productId, dto);
  }
}
