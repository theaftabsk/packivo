import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma, createPaginatedResponse } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DuplexService {
  constructor(private readonly prisma: PrismaService) {}

  async createPurchase(tenantId: string, dto: any) {
    const items = dto.items || [
      {
        gsm: dto.gsm,
        size: dto.size,
        quantitySheets: dto.quantitySheets,
        weightKg: dto.weightKg,
        rate: dto.rate || 0,
        remarks: dto.remarks,
      },
    ];

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    return this.prisma.$transaction(async (tx: any) => {
      const createdPurchases = [];

      for (const item of items) {
        const purchase = await tx.duplexPurchase.create({
          data: {
            vendorId: dto.vendorId,
            challanNo: dto.challanNo,
            gsm: Number(item.gsm),
            size: item.size,
            quantitySheets: Number(item.quantitySheets),
            weightKg: Number(item.weightKg),
            rate: Number(item.rate || 0),
            purchaseDate,
            deliveredTo: dto.deliveredTo,
            remarks: item.remarks || dto.remarks,
            tenantId,
          },
        });

        // Update RAW stock
        await tx.duplexStock.upsert({
          where: {
            gsm_size_type_tenantId: {
              gsm: Number(item.gsm),
              size: item.size,
              type: 'RAW',
              tenantId,
            },
          },
          create: {
            gsm: Number(item.gsm),
            size: item.size,
            type: 'RAW',
            qtySheets: Number(item.quantitySheets),
            tenantId,
          },
          update: {
            qtySheets: {
              increment: Number(item.quantitySheets),
            },
          },
        });

        createdPurchases.push(purchase);
      }

      return createdPurchases[0];
    });
  }

  async getPurchases(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const page = pagination.page ? Number(pagination.page) : undefined;
    const limit = pagination.limit ? Number(pagination.limit) : undefined;

    const where: any = {
      tenantId,
      ...(search && {
        OR: [
          { challanNo: { contains: search, mode: 'insensitive' } },
          { vendor: { vendorName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    if (!page && !limit) {
      const purchases = await this.prisma.duplexPurchase.findMany({
        where,
        include: { vendor: true },
        orderBy: { purchaseDate: 'desc' },
      });

      const printJobs = await this.prisma.printJob.findMany({
        where: { tenantId },
        include: { product: true, printer: true },
        orderBy: { createdAt: 'asc' },
      });

      const mappedData = purchases.map((purchase: any) => {
        const sizeNormalized = purchase.size ? purchase.size.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
        
        const matchingJobs = printJobs.filter((job: any) => {
          const jobSizeNormalized = job.product.duplexSize ? job.product.duplexSize.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
          const jobGsm = job.product.cartonTopPaperGsm;
          
          return (
            jobSizeNormalized === sizeNormalized &&
            jobGsm === purchase.gsm &&
            new Date(job.createdAt) >= new Date(purchase.purchaseDate)
          );
        });

        const logs = [];
        
        logs.push({
          date: purchase.purchaseDate.toISOString(),
          type: 'Initial Purchase (Inward Stock)',
          qtyUsed: null,
          balanceStock: purchase.quantitySheets,
        });

        let currentBalance = purchase.quantitySheets;
        let totalQtyUsed = 0;
        let latestPrintDate = null;

        for (const job of matchingJobs) {
          if (currentBalance <= 0) break;

          const qtyToDeduct = Math.min(job.issuedSheets, currentBalance);
          currentBalance -= qtyToDeduct;
          totalQtyUsed += qtyToDeduct;
          latestPrintDate = job.createdAt.toISOString();

          logs.push({
            date: job.createdAt.toISOString(),
            type: `Print Job: ${job.product.name}`,
            details: `Challan: ${job.jobNo} | Printer: ${job.printer?.vendorName || '—'}`,
            qtyUsed: -qtyToDeduct,
            balanceStock: currentBalance,
          });
        }

        return {
          ...purchase,
          latestPrintDate,
          totalQtyUsed,
          balanceStock: currentBalance,
          consumptionHistory: logs,
        };
      });

      return mappedData;
    }

    const itemsLimit = limit || 20;
    const currentPage = page || 1;
    const skip = (currentPage - 1) * itemsLimit;

    const [purchases, totalItems] = await Promise.all([
      this.prisma.duplexPurchase.findMany({
        where,
        include: { vendor: true },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: itemsLimit,
      }),
      this.prisma.duplexPurchase.count({ where }),
    ]);

    const sizes = Array.from(new Set(purchases.map((p: any) => p.size)));
    const gsms = Array.from(new Set(purchases.map((p: any) => p.gsm)));

    const printJobs = await this.prisma.printJob.findMany({
      where: {
        tenantId,
        product: {
          cartonTopPaperGsm: { in: gsms },
        },
      },
      include: { product: true, printer: true },
      orderBy: { createdAt: 'asc' },
    });

    const mappedData = purchases.map((purchase: any) => {
      const sizeNormalized = purchase.size ? purchase.size.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
      
      const matchingJobs = printJobs.filter((job: any) => {
        const jobSizeNormalized = job.product.duplexSize ? job.product.duplexSize.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
        const jobGsm = job.product.cartonTopPaperGsm;
        
        return (
          jobSizeNormalized === sizeNormalized &&
          jobGsm === purchase.gsm &&
          new Date(job.createdAt) >= new Date(purchase.purchaseDate)
        );
      });

      const logs = [];
      
      logs.push({
        date: purchase.purchaseDate.toISOString(),
        type: 'Initial Purchase (Inward Stock)',
        qtyUsed: null,
        balanceStock: purchase.quantitySheets,
      });

      let currentBalance = purchase.quantitySheets;
      let totalQtyUsed = 0;
      let latestPrintDate = null;

      for (const job of matchingJobs) {
        if (currentBalance <= 0) break;

        const qtyToDeduct = Math.min(job.issuedSheets, currentBalance);
        currentBalance -= qtyToDeduct;
        totalQtyUsed += qtyToDeduct;
        latestPrintDate = job.createdAt.toISOString();

        logs.push({
          date: job.createdAt.toISOString(),
          type: `Print Job: ${job.product.name}`,
          details: `Challan: ${job.jobNo} | Printer: ${job.printer?.vendorName || '—'}`,
          qtyUsed: -qtyToDeduct,
          balanceStock: currentBalance,
        });
      }

      return {
        ...purchase,
        latestPrintDate,
        totalQtyUsed,
        balanceStock: currentBalance,
        consumptionHistory: logs,
      };
    });

    return createPaginatedResponse(mappedData, totalItems, currentPage, itemsLimit);
  }

  async getStock(tenantId: string) {
    return this.prisma.duplexStock.findMany({
      where: { tenantId },
      orderBy: [{ size: 'asc' }, { gsm: 'asc' }],
    });
  }
}
