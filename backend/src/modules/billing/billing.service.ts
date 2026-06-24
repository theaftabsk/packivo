import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async submitManualPayment(tenantId: string, dto: { planId: string; transactionId: string; screenshot: string }) {
    // 1. Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    // 2. Find the plan selected
    const plan = await this.prisma.plan.findFirst({
      where: {
        OR: [
          { id: dto.planId },
          { name: dto.planId.toUpperCase() },
        ],
      },
    });
    if (!plan) {
      throw new NotFoundException('Selected plan not found.');
    }

    // 3. Perform database operations in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create a subscription record with PAST_DUE or UNPAID status until approved
      const subscription = await tx.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
          status: 'UNPAID', // Unpaid until approved
        },
      });

      // Create a Payment record storing the manual details
      await tx.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: plan.price,
          currency: 'INR',
          status: 'PENDING',
          gateway: 'MANUAL',
          gatewayRef: dto.transactionId || 'MANUAL-REF',
          screenshot: dto.screenshot, // Store screenshot base64
          transactionId: dto.transactionId,
        },
      });

      // Set the tenant's subscriptionStatus to PENDING_APPROVAL
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'PENDING_APPROVAL',
        },
      });

      return {
        success: true,
        message: 'Payment screenshot submitted successfully. Review is pending.',
      };
    });
  }
}
