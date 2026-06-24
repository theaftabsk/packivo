import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query } from '@nestjs/common';
import { ProductionService } from './production.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post('jobs')
  createJob(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.productionService.createJob(tenantId, dto);
  }

  @Patch('jobs/:id/complete')
  completeJob(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.productionService.completeJob(tenantId, id, dto);
  }

  @Get('jobs')
  getJobs(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plyType') plyType?: string,
    @Query('productId') productId?: string,
  ) {
    return this.productionService.getJobs(tenantId, { page, limit, search, status, plyType, productId });
  }
}
