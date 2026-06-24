import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinishedGoodsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStock(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
    });
    const productIds = products.map((p) => p.id);

    const stocks = await this.prisma.finishedGoodsStock.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    return stocks.map((stock) => {
      const product = products.find((p) => p.id === stock.productId);
      return {
        ...stock,
        product,
      };
    });
  }

  async adjustStock(tenantId: string, productId: string, dto: any) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }

    const { amount, reason, userId } = dto;

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.finishedGoodsStock.findUnique({
        where: { productId },
      });

      if (!stock) {
        throw new NotFoundException(`Finished Goods stock record not found for this product.`);
      }

      if (stock.totalStock + amount < 0) {
        throw new BadRequestException('Cannot adjust stock below 0.');
      }

      const updatedStock = await tx.finishedGoodsStock.update({
        where: { productId },
        data: {
          totalStock: {
            increment: amount,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'FINISHED_GOODS_ADJUST',
          details: JSON.stringify({ productId, amount, reason }),
          tenantId,
        },
      });

      return updatedStock;
    });
  }
}
