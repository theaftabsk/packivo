import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PrintersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    const count = await this.prisma.printer.count({ where: { tenantId } });
    const printerCode = `PRN-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.printer.create({
      data: { ...dto, printerCode, tenantId },
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
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.printer,
      {
        where,
        orderBy: { name: 'asc' },
      },
      pagination,
    );
  }

  async findOne(tenantId: string, id: string) {
    const printer = await this.prisma.printer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!printer) throw new NotFoundException(`Printer ${id} not found`);
    return printer;
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.printer.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.printer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
