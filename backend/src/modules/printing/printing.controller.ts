import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('printing')
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Post('jobs')
  createJob(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.printingService.createJob(tenantId, dto);
  }

  @Patch('jobs/:id/complete')
  completeJob(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.printingService.completeJob(tenantId, id, dto);
  }

  @Post('jobs/:id/adjust')
  adjustJobStock(
    @GetTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: any
  ) {
    return this.printingService.adjustJobStock(tenantId, id, dto);
  }

  @Get('jobs')
  getJobs(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('printerId') printerId?: string,
  ) {
    return this.printingService.getJobs(tenantId, { page, limit, search, status, printerId });
  }
}
