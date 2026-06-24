import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('upload/:module')
  async upload(
    @GetTenant('id') tenantId: string,
    @Body('userId') userId: string,
    @Param('module') module: string,
    @Body('batchId') batchId: string,
    @Body('items') items: any[],
  ) {
    return this.importsService.importData(tenantId, userId || 'sys', module, batchId, items);
  }

  @Get('history')
  async getHistory(@GetTenant('id') tenantId: string) {
    return this.importsService.getImportHistory(tenantId);
  }

  @Post('rollback/:auditLogId')
  async rollback(@GetTenant('id') tenantId: string, @Param('auditLogId') auditLogId: string) {
    return this.importsService.rollbackBatch(tenantId, auditLogId);
  }
}
