import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post()
  create(@GetTenant('id') tenantId: string, @Body() dto: any) {
    return this.printersService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @GetTenant('id') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.printersService.findAll(tenantId, { page, limit, search, status });
  }

  @Get(':id')
  findOne(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.printersService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@GetTenant('id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.printersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@GetTenant('id') tenantId: string, @Param('id') id: string) {
    return this.printersService.remove(tenantId, id);
  }
}
