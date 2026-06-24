import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: any) {
    // Auto-generate vendorCode: count existing (including soft-deleted) and pad
    const count = await this.prisma.vendor.count({ where: { tenantId } });
    const vendorCode = `VND-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.vendor.create({
      data: {
        ...dto,
        vendorCode,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, pagination: PaginationDto, material?: string) {
    const search = pagination.search?.trim();
    const status = pagination.status;

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(material && {
        suppliedMaterials: { has: material },
      }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(search && {
        OR: [
          { vendorName: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.vendor,
      {
        where,
        orderBy: { vendorName: 'asc' },
      },
      pagination,
    );
  }

  async findOne(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found.`);
    }
    return vendor;
  }

  async update(tenantId: string, id: string, dto: any) {
    // Ensure vendor belongs to tenant
    await this.findOne(tenantId, id);

    return this.prisma.vendor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    // Ensure vendor belongs to tenant
    await this.findOne(tenantId, id);

    return this.prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
