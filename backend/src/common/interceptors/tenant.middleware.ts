import { Injectable, NestMiddleware, NotFoundException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let subdomain = req.headers['x-tenant-subdomain'] as string;

    if (!subdomain && req.headers.host) {
      const host = req.headers.host;
      const parts = host.split('.');
      // Support subdomain.domain.com
      if (parts.length > 2) {
        subdomain = parts[0];
      }
    }

    // Ignore generic/admin subdomains
    if (subdomain && subdomain !== 'www' && subdomain !== 'admin' && subdomain !== 'api') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with subdomain '${subdomain}' not found.`);
      }

      if (tenant.status === 'SUSPENDED') {
        throw new BadRequestException('This tenant account has been suspended. Please contact support.');
      }

      // Attach to request
      (req as any)['tenant'] = tenant;
      (req as any)['tenantId'] = tenant.id;
    }

    next();
  }
}
