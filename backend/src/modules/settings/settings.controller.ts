import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { GetTenant } from '../../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@GetTenant('id') tenantId: string) {
    return this.settingsService.getSettings(tenantId);
  }

  @Patch()
  updateSettings(@GetTenant('id') tenantId: string, @Body() body: any) {
    return this.settingsService.updateSettings(tenantId, body);
  }
}
