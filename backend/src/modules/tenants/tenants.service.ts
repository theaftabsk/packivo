import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        subdomain: dto.subdomain,
        plan: dto.plan || 'STARTER',
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
            payments: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: true,
        subscriptions: {
          include: { plan: true, payments: true },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    return tenant;
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async approveSubscription(id: string) {
    const tenant = await this.findOne(id);
    
    // Find the latest pending payment & its associated subscription
    const latestSubscription = tenant.subscriptions[0];
    if (!latestSubscription) {
      throw new BadRequestException('No subscription found for this tenant.');
    }

    const pendingPayment = latestSubscription.payments.find(p => p.status === 'PENDING');

    return this.prisma.$transaction(async (tx) => {
      // 1. Approve subscription status
      await tx.subscription.update({
        where: { id: latestSubscription.id },
        data: {
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expiry 30 days from approval
        },
      });

      // 2. Approve payment record if exists
      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { status: 'SUCCESS' },
        });
      }

      // 3. Update tenant trial dates & subscription status
      const planName = latestSubscription.plan.name;
      return tx.tenant.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          subscriptionStatus: planName,
        },
      });
    });
  }

  async toggleStatus(id: string) {
    const tenant = await this.findOne(id);
    const newStatus = tenant.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    
    await this.prisma.tenant.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      success: true,
      status: newStatus,
    };
  }
}
