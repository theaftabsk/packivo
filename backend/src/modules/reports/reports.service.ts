import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPurchaseReport(tenantId: string) {
    const duplex = await this.prisma.duplexPurchase.findMany({
      where: { tenantId },
      include: { vendor: true },
      orderBy: { purchaseDate: 'desc' },
    });

    const kraft = await this.prisma.kraftPurchase.findMany({
      where: { tenantId },
      include: { vendor: true },
      orderBy: { purchaseDate: 'desc' },
    });

    return { duplex, kraft };
  }

  async getProductionReport(tenantId: string) {
    return this.prisma.productionJob.findMany({
      where: { tenantId },
      include: { product: true },
      orderBy: { plannedDate: 'desc' },
    });
  }

  async getDispatchReport(tenantId: string) {
    return this.prisma.dispatch.findMany({
      where: { tenantId },
      include: { customer: true, product: true },
      orderBy: { dispatchDate: 'desc' },
    });
  }

  async getStockReport(tenantId: string) {
    const duplex = await this.prisma.duplexStock.findMany({
      where: { tenantId },
    });

    const kraft = await this.prisma.kraftStock.findMany({
      where: { tenantId },
    });

    return { duplex, kraft };
  }
}
