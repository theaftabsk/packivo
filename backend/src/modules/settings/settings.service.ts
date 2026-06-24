import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    // 1. Verify if the tenant actually exists
    const tenantExists = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    let actualTenantId = tenantId;
    if (!tenantExists) {
      // Stale tenant session (e.g. from local seeder re-run). Fallback to first available tenant.
      const firstTenant = await this.prisma.tenant.findFirst();
      if (!firstTenant) {
        throw new NotFoundException('No active tenants found in the system.');
      }
      actualTenantId = firstTenant.id;
    }

    let settings = await this.prisma.setting.findUnique({
      where: { tenantId: actualTenantId },
    });

    if (!settings) {
      settings = await this.prisma.setting.create({
        data: {
          tenantId: actualTenantId,
          formulaThreePly: 'T + (F * 1.5) + B',
          formulaFivePly: 'T + (F * 3.0) + B',
          companyName: tenantExists ? tenantExists.name : 'GIGANI Packaging',
          gstinNumber: '24XXXXXXXXXXXXX',
          factoryAddress: 'Umargam, Gujarat',
          lowStockThreshold: 100,
          enableWhatsApp: false,
        },
      });
    }

    return settings;
  }

  async updateSettings(tenantId: string, data: any) {
    const settings = await this.getSettings(tenantId);

    if (data.companyName) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { name: data.companyName },
      });
    }

    return this.prisma.setting.update({
      where: { id: settings.id },
      data: {
        formulaThreePly: data.formulaThreePly,
        formulaFivePly: data.formulaFivePly,
        companyName: data.companyName,
        gstinNumber: data.gstinNumber,
        factoryAddress: data.factoryAddress,
        lowStockThreshold: data.lowStockThreshold !== undefined ? Number(data.lowStockThreshold) : undefined,
        enableWhatsApp: data.enableWhatsApp,
      },
    });
  }
}
