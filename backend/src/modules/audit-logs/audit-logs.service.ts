import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginatePrisma } from '../../common/helpers/pagination.helper';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, pagination: PaginationDto & { actionFilter?: string }) {
    const search = pagination.search?.trim();
    const actionFilter = pagination.actionFilter;

    let actionCondition: any = undefined;
    if (actionFilter && actionFilter !== 'ALL') {
      if (actionFilter === 'ADJUST') {
        actionCondition = 'FINISHED_GOODS_ADJUST';
      } else if (actionFilter === 'IMPORT') {
        actionCondition = 'IMPORT_BATCH';
      } else {
        actionCondition = actionFilter.toUpperCase();
      }
    }

    const where: any = {
      tenantId,
      ...(actionCondition && { action: actionCondition }),
      ...(search && {
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { details: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };

    return paginatePrisma(
      this.prisma.auditLog,
      {
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      },
      pagination,
    );
  }
}
