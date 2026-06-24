import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(tenantId: string, dto: any) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Check if enough PRINTED duplex sheets are available (either on selected batch printJob or global)
      if (dto.printJobId) {
        const printJob = await tx.printJob.findFirst({
          where: { id: dto.printJobId, tenantId },
        });
        if (!printJob) {
          throw new NotFoundException(`Selected Print Job not found.`);
        }
        if (printJob.availableStock < dto.targetQty) {
          throw new BadRequestException(
            `Insufficient printed duplex stock in the selected batch. Available: ${printJob.availableStock} sheets.`,
          );
        }
        await tx.printJob.update({
          where: { id: dto.printJobId },
          data: {
            availableStock: {
              decrement: dto.targetQty,
            },
          },
        });
      } else {
        const printedStock = await tx.duplexStock.findUnique({
          where: {
            gsm_size_type_tenantId: {
              gsm: dto.gsm,
              size: product.duplexSize,
              type: 'PRINTED',
              tenantId,
            },
          },
        });

        if (!printedStock || printedStock.qtySheets < dto.targetQty) {
          throw new BadRequestException(
            `Insufficient PRINTED duplex stock. Available: ${printedStock ? printedStock.qtySheets : 0} sheets.`,
          );
        }

        await tx.duplexStock.update({
          where: {
            gsm_size_type_tenantId: {
              gsm: dto.gsm,
              size: product.duplexSize,
              type: 'PRINTED',
              tenantId,
            },
          },
          data: {
            qtySheets: {
              decrement: dto.targetQty,
            },
          },
        });
      }

      // 2. Estimate required Kraft roll weight
      let tenantSettings = await tx.setting.findUnique({
        where: { tenantId },
      });
      if (!tenantSettings) {
        tenantSettings = await tx.setting.create({ data: { tenantId } });
      }

      let flutingFactor = 1.5;
      if (product.plyType === 'THREE_PLY') {
        const match = tenantSettings.formulaThreePly.match(/F\s*\*\s*([\d.]+)/);
        if (match) flutingFactor = parseFloat(match[1]);
      } else {
        flutingFactor = 3.0;
        const match = tenantSettings.formulaFivePly.match(/F\s*\*\s*([\d.]+)/);
        if (match) flutingFactor = parseFloat(match[1]);
      }

      const dims = product.kraftSize.toLowerCase().split('x');
      const lengthIn = dims[0] ? parseFloat(dims[0]) : 30;
      const widthIn = dims[1] ? parseFloat(dims[1]) : 20;

      const backingGsm = dto.backingGsm || 150;
      const flutingGsm = dto.flutingGsm || 120;

      let totalKraftGsm = 0;
      if (product.plyType === 'THREE_PLY') {
        totalKraftGsm = (flutingGsm * flutingFactor) + backingGsm;
      } else {
        totalKraftGsm = (flutingGsm * flutingFactor) + (backingGsm * 2);
      }

      const totalKraftRequiredKg = (((lengthIn * widthIn * totalKraftGsm) / 1550 / 1000) * dto.targetQty);

      // Match roll size width in inches from product spec sheet
      const parseRollSize = (sizeStr: string) => {
        const parts = sizeStr.toLowerCase().split('x');
        return parts[0] ? parseFloat(parts[0]) : 0;
      };
      const rollSize = parseRollSize(product.kraftSize);

      let kraftStock = await tx.kraftStock.findFirst({
        where: { rollSize, gsm: backingGsm, tenantId },
      });

      if (!kraftStock) {
        // Fallback to match by GSM only if rollSize is not pre-initialized
        kraftStock = await tx.kraftStock.findFirst({
          where: { gsm: backingGsm, tenantId },
        });
      }

      if (!kraftStock || kraftStock.weightKg < totalKraftRequiredKg) {
        throw new BadRequestException(
          `Insufficient Kraft roll stock. Required: ${Math.round(totalKraftRequiredKg * 100) / 100} Kg. Available: ${kraftStock ? kraftStock.weightKg : 0} Kg.`,
        );
      }

      // 3. Deduct stock (Kraft rolls)
      await tx.kraftStock.update({
        where: { id: kraftStock.id },
        data: {
          weightKg: {
            decrement: totalKraftRequiredKg,
          },
        },
      });

      // 4. Create Production Job (direct complete or in progress)
      const isCompleted = dto.isCompleted === true;
      const status = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
      const producedQty = isCompleted ? dto.targetQty : 0;
      const completedDate = isCompleted ? new Date() : null;
      const plannedDate = dto.plannedDate ? new Date(dto.plannedDate) : new Date();

      const job = await tx.productionJob.create({
        data: {
          jobCardNo: dto.jobCardNo,
          productId: dto.productId,
          targetQty: dto.targetQty,
          producedQty,
          status,
          plannedDate,
          completedDate,
          tenantId,
        },
      });

      // 5. If direct complete, increment Finished Goods Stock immediately
      if (isCompleted) {
        await tx.finishedGoodsStock.upsert({
          where: { productId: dto.productId },
          create: {
            productId: dto.productId,
            totalStock: dto.targetQty,
          },
          update: {
            totalStock: {
              increment: dto.targetQty,
            },
          },
        });
      }

      return job;
    });
  }

  async completeJob(tenantId: string, id: string, dto: any) {
    const job = await this.prisma.productionJob.findFirst({
      where: { id, tenantId },
    });

    if (!job) {
      throw new NotFoundException(`Production job not found.`);
    }

    if (job.status === 'COMPLETED') {
      throw new BadRequestException('Job already completed.');
    }

    const producedQty = dto.producedQty || job.targetQty;

    return this.prisma.$transaction(async (tx: any) => {
      // Update job status
      const updatedJob = await tx.productionJob.update({
        where: { id },
        data: {
          producedQty,
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });

      // Add to Finished Goods Stock
      await tx.finishedGoodsStock.upsert({
        where: { productId: job.productId },
        create: {
          productId: job.productId,
          totalStock: producedQty,
        },
        update: {
          totalStock: {
            increment: producedQty,
          },
        },
      });

      return updatedJob;
    });
  }

  async getJobs(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const status = pagination.status;
    const plyType = pagination.plyType;
    const productId = pagination.productId;

    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(plyType && { product: { plyType } }),
      ...(productId && { productId }),
      ...(search && {
        OR: [
          { jobCardNo: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          {
            product: {
              customer: {
                customerName: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.productionJob,
      {
        where,
        include: {
          product: {
            include: { customer: true },
          },
        },
        orderBy: { plannedDate: 'desc' },
      },
      pagination,
    );
  }
}
