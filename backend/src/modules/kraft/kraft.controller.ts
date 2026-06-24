import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { KraftService } from './kraft.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('kraft')
export class KraftController {
  constructor(private readonly kraftService: KraftService) {}

  @Post('purchases')
  createPurchase(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.kraftService.createPurchase(tenantId, dto);
  }

  @Get('purchases')
  getPurchases(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.kraftService.getPurchases(tenantId, { page, limit, search });
  }

  @Get('stock')
  getStock(@GetTenant('id') tenantId: string) {
    return this.kraftService.getStock(tenantId);
  }

  @Post('calculate')
  calculateRequirements(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.kraftService.calculateRequirements(tenantId, dto);
  }
}
