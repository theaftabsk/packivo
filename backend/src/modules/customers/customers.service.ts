import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const count = await this.prisma.customer.count({ where: { tenantId } });
    const customerCode = `CUS-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.customer.create({
      data: { ...dto, customerCode, tenantId },
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const search = pagination.search?.trim();
    const status = pagination.status;

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.customer,
      {
        where,
        orderBy: { customerName: 'asc' },
      },
      pagination,
    );
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
