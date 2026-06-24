import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { DuplexService } from './duplex.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('duplex')
export class DuplexController {
  constructor(private readonly duplexService: DuplexService) {}

  @Post('purchases')
  createPurchase(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.duplexService.createPurchase(tenantId, dto);
  }

  @Get('purchases')
  getPurchases(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.duplexService.getPurchases(tenantId, { page, limit, search });
  }

  @Get('stock')
  getStock(@GetTenant('id') tenantId: string) {
    return this.duplexService.getStock(tenantId);
  }
}
