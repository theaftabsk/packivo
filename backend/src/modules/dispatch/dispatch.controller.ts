import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  createDispatch(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.dispatchService.createDispatch(tenantId, dto);
  }

  @Get()
  getDispatches(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.dispatchService.getDispatches(tenantId, { page, limit, search, customerId });
  }
}
