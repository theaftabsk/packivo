import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    return this.prisma.product.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const status = pagination.status;
    const customerId = pagination.customerId;

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(customerId && { customerId }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              customerName: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.product,
      {
        where,
        include: { customer: true },
        orderBy: { name: 'asc' },
      },
      pagination,
    );
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true },
    });
    if (!product) {
      throw new NotFoundException(`Product spec with ID ${id} not found.`);
    }
    return product;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async getStockAnalysis(tenantId: string, id: string) {
    const product = await this.findOne(tenantId, id);

    // 1. Available Ready Product Stock
    let finishedGoodsStock = await this.prisma.finishedGoodsStock.findUnique({
      where: { productId: id },
    });
    if (!finishedGoodsStock) {
      finishedGoodsStock = await this.prisma.finishedGoodsStock.create({
        data: { productId: id, totalStock: 0, allocatedStock: 0 },
      });
    }

    // 2. Raw & Printed Duplex Paper Stock
    const duplexSizeNormalized = product.duplexSize ? product.duplexSize.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
    const duplexGsm = product.cartonTopPaperGsm || 0;

    const allDuplexStocks = await this.prisma.duplexStock.findMany({
      where: { tenantId },
    });

    const matchingDuplexStocks = allDuplexStocks.filter(s => {
      const sizeNormalized = s.size ? s.size.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase() : '';
      return sizeNormalized === duplexSizeNormalized && s.gsm === duplexGsm;
    });

    const rawDuplexStock = matchingDuplexStocks.find(s => s.type === 'RAW')?.qtySheets || 0;
    const printedDuplexStock = matchingDuplexStocks.find(s => s.type === 'PRINTED')?.qtySheets || 0;

    // 3. Backing Ply Board / Kraft Rolls matching rolls stock weight
    const kraftWidthMatch = product.kraftSize ? product.kraftSize.match(/^(\d+(?:\.\d+)?)/) : null;
    const kraftWidth = kraftWidthMatch ? parseFloat(kraftWidthMatch[1]) : 0;

    const kraftStocks = await this.prisma.kraftStock.findMany({
      where: {
        tenantId,
        rollSize: kraftWidth,
      },
    });

    return {
      finishedGoods: finishedGoodsStock,
      rawDuplex: {
        qtySheets: rawDuplexStock,
        size: product.duplexSize,
        gsm: duplexGsm,
      },
      printedDuplex: {
        qtySheets: printedDuplexStock,
        size: product.duplexSize,
        gsm: duplexGsm,
      },
      kraftRolls: kraftStocks,
      kraftWidth,
      kraftSize: product.kraftSize,
      plyType: product.plyType === 'FIVE_PLY' ? '5-ply' : '3-ply',
    };
  }
}
