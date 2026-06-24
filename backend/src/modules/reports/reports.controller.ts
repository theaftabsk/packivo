import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('purchases')
  async getPurchaseReport(@GetTenant('id') tenantId: string) {
    return this.reportsService.getPurchaseReport(tenantId);
  }

  @Get('production')
  async getProductionReport(@GetTenant('id') tenantId: string) {
    return this.reportsService.getProductionReport(tenantId);
  }

  @Get('dispatch')
  async getDispatchReport(@GetTenant('id') tenantId: string) {
    return this.reportsService.getDispatchReport(tenantId);
  }

  @Get('stock')
  async getStockReport(@GetTenant('id') tenantId: string) {
    return this.reportsService.getStockReport(tenantId);
  }
}
