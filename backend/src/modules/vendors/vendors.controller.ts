import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.vendorsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('material') material?: string,
    @Query('status') status?: string,
  ) {
    return this.vendorsService.findAll(tenantId, { page, limit, search, status }, material);
  }

  @Get(':id')
  findOne(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.vendorsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.vendorsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.vendorsService.remove(tenantId, id);
  }
}
