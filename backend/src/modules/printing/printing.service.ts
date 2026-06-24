import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PrintingService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(tenantId: string, dto: any) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }

    const duplexSize = product.duplexSize;
    const gsm = dto.gsm;

    return this.prisma.$transaction(async (tx: any) => {
      // Check if enough RAW duplex stock exists
      const rawStock = await tx.duplexStock.findUnique({
        where: {
          gsm_size_type_tenantId: {
            gsm,
            size: duplexSize,
            type: 'RAW',
            tenantId,
          },
        },
      });

      if (!rawStock || rawStock.qtySheets < dto.issuedSheets) {
        throw new BadRequestException(
          `Insufficient RAW duplex stock. Available: ${rawStock ? rawStock.qtySheets : 0} sheets.`,
        );
      }

      // Deduct RAW duplex stock
      await tx.duplexStock.update({
        where: {
          gsm_size_type_tenantId: {
            gsm,
            size: duplexSize,
            type: 'RAW',
            tenantId,
          },
        },
        data: {
          qtySheets: {
            decrement: dto.issuedSheets,
          },
        },
      });

      // Create print job
      const job = await tx.printJob.create({
        data: {
          jobNo: dto.jobNo,
          productId: dto.productId,
          printerId: dto.printerId,
          plannedQty: dto.plannedQty,
          issuedSheets: dto.issuedSheets,
          cuttingSize: dto.cuttingSize || null,
          expectedOutcomeImage: dto.expectedOutcomeImage || null,
          remarks: dto.remarks || null,
          status: 'ISSUED',
          tenantId,
        },
      });

      return job;
    });
  }

  async completeJob(tenantId: string, id: string, dto: any) {
    const job = await this.prisma.printJob.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });

    if (!job) {
      throw new NotFoundException(`Print job not found.`);
    }

    if (job.status === 'COMPLETED') {
      throw new BadRequestException('Job is already completed.');
    }

    const returnedSheets = dto.returnedSheets;
    const gsm = dto.gsm;

    return this.prisma.$transaction(async (tx: any) => {
      // Update print job status
      const updatedJob = await tx.printJob.update({
        where: { id },
        data: {
          returnedSheets,
          availableStock: returnedSheets,
          status: 'COMPLETED',
        },
      });

      // Add to PRINTED duplex stock
      await tx.duplexStock.upsert({
        where: {
          gsm_size_type_tenantId: {
            gsm,
            size: job.product.duplexSize,
            type: 'PRINTED',
            tenantId,
          },
        },
        create: {
          gsm,
          size: job.product.duplexSize,
          type: 'PRINTED',
          qtySheets: returnedSheets,
          tenantId,
        },
        update: {
          qtySheets: {
            increment: returnedSheets,
          },
        },
      });

      return updatedJob;
    });
  }

  async getJobs(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const status = pagination.status;
    const printerId = pagination.printerId;

    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(printerId && { printerId }),
      ...(search && {
        OR: [
          { jobNo: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { printer: { vendorName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.printJob,
      {
        where,
        include: { product: true, printer: true },
        orderBy: { createdAt: 'desc' },
      },
      pagination,
    );
  }

  async adjustJobStock(tenantId: string, id: string, dto: any) {
    const job = await this.prisma.printJob.findFirst({
      where: { id, tenantId },
      include: { product: true },
    });

    if (!job) {
      throw new NotFoundException(`Print job not found.`);
    }

    const adjustmentQty = Number(dto.adjustmentQty);
    if (isNaN(adjustmentQty)) {
      throw new BadRequestException('Adjustment quantity must be a valid number.');
    }

    if (job.availableStock + adjustmentQty < 0) {
      throw new BadRequestException(
        `Insufficient stock for adjustment. Current stock: ${job.availableStock} sheets. Result cannot be negative.`,
      );
    }

    const gsm = job.product.cartonTopPaperGsm || 230;
    const size = job.product.duplexSize;

    return this.prisma.$transaction(async (tx: any) => {
      // Update print job availableStock
      const updatedJob = await tx.printJob.update({
        where: { id },
        data: {
          availableStock: {
            increment: adjustmentQty,
          },
        },
      });

      // Update global DuplexStock of type PRINTED
      await tx.duplexStock.upsert({
        where: {
          gsm_size_type_tenantId: {
            gsm,
            size,
            type: 'PRINTED',
            tenantId,
          },
        },
        create: {
          gsm,
          size,
          type: 'PRINTED',
          qtySheets: Math.max(0, adjustmentQty),
          tenantId,
        },
        update: {
          qtySheets: {
            increment: adjustmentQty,
          },
        },
      });

      return updatedJob;
    });
  }
}
