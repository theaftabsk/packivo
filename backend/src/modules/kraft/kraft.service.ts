import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma, createPaginatedResponse } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class KraftService {
  constructor(private readonly prisma: PrismaService) {}

  async createPurchase(tenantId: string, dto: any) {
    const items = dto.items || [
      {
        rollSize: dto.rollSize,
        gsm: dto.gsm,
        weightKg: dto.weightKg,
        rate: dto.rate || 0,
        qtyRolls: dto.qtyRolls || 1,
        paperType: dto.paperType || 'Natural',
        remarks: dto.remarks,
      },
    ];

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    return this.prisma.$transaction(async (tx: any) => {
      const createdPurchases = [];

      for (const item of items) {
        const totalWeight = Number(item.weightKg) * Number(item.qtyRolls || 1);

        const purchase = await tx.kraftPurchase.create({
          data: {
            vendorId: dto.vendorId,
            challanNo: dto.challanNo,
            invoiceNo: dto.invoiceNo,
            deliveredTo: dto.deliveredTo,
            paperType: item.paperType || 'Natural',
            qtyRolls: Number(item.qtyRolls || 1),
            rollSize: Number(item.rollSize),
            gsm: Number(item.gsm),
            weightKg: totalWeight,
            rate: Number(item.rate || 0),
            remarks: item.remarks || dto.remarks,
            purchaseDate,
            tenantId,
          },
        });

        // Update Kraft Stock (weightKg cumulative)
        await tx.kraftStock.upsert({
          where: {
            rollSize_gsm_tenantId: {
              rollSize: Number(item.rollSize),
              gsm: Number(item.gsm),
              tenantId,
            },
          },
          create: {
            rollSize: Number(item.rollSize),
            gsm: Number(item.gsm),
            weightKg: totalWeight,
            tenantId,
          },
          update: {
            weightKg: {
              increment: totalWeight,
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
          { invoiceNo: { contains: search, mode: 'insensitive' } },
          { vendor: { vendorName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const parseRollSize = (kraftSizeStr: string): number => {
      if (!kraftSizeStr) return 0;
      const parts = kraftSizeStr.toLowerCase().split('x');
      const parsed = parseFloat(parts[0]?.trim());
      return isNaN(parsed) ? 0 : parsed;
    };

    const calculateJobWeight = (product: any, qty: number) => {
      let flutingFactor = 1.5;
      if (product.plyType === 'THREE_PLY') {
        flutingFactor = 1.5;
      } else {
        flutingFactor = 3.0;
      }

      const dims = product.kraftSize.toLowerCase().split('x');
      const lengthIn = dims[0] ? parseFloat(dims[0]) : 30;
      const widthIn = dims[1] ? parseFloat(dims[1]) : 20;

      const backingGsm = product.cartonBackingPaperGsm || 120;
      const flutingGsm = product.cartonFlutingPaperGsm || 120;

      let totalKraftGsm = 0;
      if (product.plyType === 'THREE_PLY') {
        totalKraftGsm = (flutingGsm * flutingFactor) + backingGsm;
      } else {
        totalKraftGsm = (flutingGsm * flutingFactor) + (backingGsm * 2);
      }

      return (((lengthIn * widthIn * totalKraftGsm) / 1550 / 1000) * qty);
    };

    if (!page && !limit) {
      const purchases = await this.prisma.kraftPurchase.findMany({
        where,
        include: { vendor: true },
        orderBy: { purchaseDate: 'desc' },
      });

      const productionJobs = await this.prisma.productionJob.findMany({
        where: { tenantId, status: 'COMPLETED' },
        include: { product: true },
        orderBy: { plannedDate: 'asc' },
      });

      const mappedData = purchases.map((purchase: any) => {
        const matchingJobs = productionJobs.filter((job: any) => {
          const prodRollSize = parseRollSize(job.product.kraftSize);
          const hasGsmMatch =
            job.product.cartonTopPaperGsm === purchase.gsm ||
            job.product.cartonFlutingPaperGsm === purchase.gsm ||
            job.product.cartonBackingPaperGsm === purchase.gsm;

          return (
            prodRollSize === purchase.rollSize &&
            hasGsmMatch &&
            new Date(job.plannedDate) >= new Date(purchase.purchaseDate)
          );
        });

        const logs = [];

        logs.push({
          date: purchase.purchaseDate.toISOString(),
          type: 'Initial Purchase (Inward Stock)',
          qtyUsed: null,
          balanceStock: purchase.weightKg,
        });

        let currentBalance = purchase.weightKg;
        let totalQtyUsed = 0;
        let latestProductionDate = null;

        for (const job of matchingJobs) {
          if (currentBalance <= 0) break;

          const consumedWeight = calculateJobWeight(job.product, job.producedQty || job.targetQty);
          const weightToDeduct = Math.min(consumedWeight, currentBalance);
          currentBalance -= weightToDeduct;
          totalQtyUsed += weightToDeduct;
          latestProductionDate = job.plannedDate.toISOString();

          logs.push({
            date: job.plannedDate.toISOString(),
            type: `Production Job: ${job.product.name}`,
            details: `Job Card: ${job.jobCardNo}`,
            qtyUsed: -weightToDeduct,
            balanceStock: currentBalance,
          });
        }

        return {
          ...purchase,
          latestProductionDate,
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
      this.prisma.kraftPurchase.findMany({
        where,
        include: { vendor: true },
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: itemsLimit,
      }),
      this.prisma.kraftPurchase.count({ where }),
    ]);

    const gsms = Array.from(new Set(purchases.map((p: any) => p.gsm)));

    const productionJobs = await this.prisma.productionJob.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        product: {
          OR: [
            { cartonTopPaperGsm: { in: gsms } },
            { cartonFlutingPaperGsm: { in: gsms } },
            { cartonBackingPaperGsm: { in: gsms } },
          ],
        },
      },
      include: { product: true },
      orderBy: { plannedDate: 'asc' },
    });

    const mappedData = purchases.map((purchase: any) => {
      const matchingJobs = productionJobs.filter((job: any) => {
        const prodRollSize = parseRollSize(job.product.kraftSize);
        const hasGsmMatch =
          job.product.cartonTopPaperGsm === purchase.gsm ||
          job.product.cartonFlutingPaperGsm === purchase.gsm ||
          job.product.cartonBackingPaperGsm === purchase.gsm;

        return (
          prodRollSize === purchase.rollSize &&
          hasGsmMatch &&
          new Date(job.plannedDate) >= new Date(purchase.purchaseDate)
        );
      });

      const logs = [];

      logs.push({
        date: purchase.purchaseDate.toISOString(),
        type: 'Initial Purchase (Inward Stock)',
        qtyUsed: null,
        balanceStock: purchase.weightKg,
      });

      let currentBalance = purchase.weightKg;
      let totalQtyUsed = 0;
      let latestProductionDate = null;

      for (const job of matchingJobs) {
        if (currentBalance <= 0) break;

        const consumedWeight = calculateJobWeight(job.product, job.producedQty || job.targetQty);
        const weightToDeduct = Math.min(consumedWeight, currentBalance);
        currentBalance -= weightToDeduct;
        totalQtyUsed += weightToDeduct;
        latestProductionDate = job.plannedDate.toISOString();

        logs.push({
          date: job.plannedDate.toISOString(),
          type: `Production Job: ${job.product.name}`,
          details: `Job Card: ${job.jobCardNo}`,
          qtyUsed: -weightToDeduct,
          balanceStock: currentBalance,
        });
      }

      return {
        ...purchase,
        latestProductionDate,
        totalQtyUsed,
        balanceStock: currentBalance,
        consumptionHistory: logs,
      };
    });

    return createPaginatedResponse(mappedData, totalItems, currentPage, itemsLimit);
  }

  async getStock(tenantId: string) {
    return this.prisma.kraftStock.findMany({
      where: { tenantId },
      orderBy: [{ rollSize: 'asc' }, { gsm: 'asc' }],
    });
  }

  // --- Ply Calculation Engine ---
  async calculateRequirements(tenantId: string, dto: any) {
    const { lengthIn, widthIn, qty, plyType, duplexGsm, flutingGsm, backingGsm } = dto;

    let tenantSettings = await this.prisma.setting.findUnique({
      where: { tenantId },
    });

    if (!tenantSettings) {
      tenantSettings = await this.prisma.setting.create({
        data: { tenantId },
      });
    }

    let flutingFactor = 1.5;
    if (plyType === 'THREE_PLY') {
      const match = tenantSettings.formulaThreePly.match(/F\s*\*\s*([\d.]+)/);
      if (match) flutingFactor = parseFloat(match[1]);
    } else {
      flutingFactor = 3.0;
      const match = tenantSettings.formulaFivePly.match(/F\s*\*\s*([\d.]+)/);
      if (match) flutingFactor = parseFloat(match[1]);
    }

    let totalGsm = 0;
    if (plyType === 'THREE_PLY') {
      totalGsm = duplexGsm + (flutingGsm * flutingFactor) + backingGsm;
    } else {
      totalGsm = duplexGsm + (flutingGsm * flutingFactor) + (backingGsm * 2);
    }

    const sheetWeightGrams = (lengthIn * widthIn * totalGsm) / 1550;
    const sheetWeightKg = sheetWeightGrams / 1000;
    const totalWeightKg = sheetWeightKg * qty;

    const duplexWeightKg = ((lengthIn * widthIn * duplexGsm) / 1550 / 1000) * qty;
    const flutingWeightKg = ((lengthIn * widthIn * (flutingGsm * (plyType === 'THREE_PLY' ? flutingFactor : 3.0))) / 1550 / 1000) * qty;
    const backingWeightKg = ((lengthIn * widthIn * (backingGsm * (plyType === 'THREE_PLY' ? 1.0 : 2.0))) / 1550 / 1000) * qty;

    return {
      flutingFactor,
      totalGsm,
      sheetWeightGrams: Math.round(sheetWeightGrams * 100) / 100,
      sheetWeightKg: Math.round(sheetWeightKg * 1000) / 1000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      materialBreakdown: {
        duplexQtySheets: qty,
        duplexWeightKg: Math.round(duplexWeightKg * 100) / 100,
        kraftFlutingWeightKg: Math.round(flutingWeightKg * 100) / 100,
        kraftBackingWeightKg: Math.round(backingWeightKg * 100) / 100,
        totalKraftRequiredKg: Math.round((flutingWeightKg + backingWeightKg) * 100) / 100,
      },
    };
  }
}
