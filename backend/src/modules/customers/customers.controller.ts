import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.customersService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.customersService.findAll(tenantId, { page, limit, search, status });
  }

  @Get(':id')
  findOne(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.customersService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.customersService.remove(tenantId, id);
  }
}
