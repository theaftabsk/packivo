import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.productsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.productsService.findAll(tenantId, { page, limit, search, status, customerId });
  }

  @Get(':id')
  findOne(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id);
  }

  @Get(':id/stock-analysis')
  getStockAnalysis(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.productsService.getStockAnalysis(tenantId, id);
  }
}
