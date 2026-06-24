import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('submit-manual-payment')
  async submitManualPayment(@Request() req: any, @Body() body: any) {
    const tenantId = req.user.tenantId;
    return this.billingService.submitManualPayment(tenantId, body);
  }
}
