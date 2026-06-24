import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async createDispatch(tenantId: string, dto: any) {
    return this.prisma.$transaction(async (tx: any) => {
      // Check finished goods stock
      const stock = await tx.finishedGoodsStock.findUnique({
        where: { productId: dto.productId },
      });

      if (!stock || stock.totalStock < dto.qtyDispatched) {
        throw new BadRequestException(
          `Insufficient finished goods stock. Available: ${stock ? stock.totalStock : 0} boxes.`,
        );
      }

      // Deduct finished goods stock
      await tx.finishedGoodsStock.update({
        where: { productId: dto.productId },
        data: {
          totalStock: {
            decrement: dto.qtyDispatched,
          },
        },
      });

      // Create dispatch record
      const dispatch = await tx.dispatch.create({
        data: {
          invoiceNo: dto.invoiceNo,
          challanNo: dto.challanNo,
          customerId: dto.customerId,
          productId: dto.productId,
          qtyDispatched: dto.qtyDispatched,
          vehicleNo: dto.vehicleNo,
          lrNo: dto.lrNo,
          transporterName: dto.transporterName,
          tenantId,
        },
      });

      return dispatch;
    });
  }

  async getDispatches(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const customerId = pagination.customerId;
    const productId = pagination.productId;

    const where: any = {
      tenantId,
      ...(customerId && { customerId }),
      ...(productId && { productId }),
      ...(search && {
        OR: [
          { invoiceNo: { contains: search, mode: 'insensitive' } },
          { challanNo: { contains: search, mode: 'insensitive' } },
          { customer: { customerName: { contains: search, mode: 'insensitive' } } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.dispatch,
      {
        where,
        include: {
          customer: true,
          product: true,
        },
        orderBy: { dispatchDate: 'desc' },
      },
      pagination,
    );
  }
}
