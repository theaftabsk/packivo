import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // Only log write operations for authenticated users inside a tenant
    if (!user || !user.id || !user.tenantId || ['POST', 'PATCH', 'PUT', 'DELETE'].indexOf(method) === -1) {
      return next.handle();
    }

    // Standardize URL path to extract the entity name
    const pathParts = url.split('?')[0].split('/');
    // e.g. /products -> entity = 'products'
    const entity = pathParts[1];

    const auditedEntities = ['products', 'customers', 'vendors', 'printers', 'duplex', 'kraft'];
    if (!entity || auditedEntities.indexOf(entity) === -1) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async (data) => {
          try {
            let action = 'CREATE';
            if (method === 'PATCH' || method === 'PUT') {
              action = 'UPDATE';
            } else if (method === 'DELETE') {
              action = 'DELETE';
            }

            let tableName = entity;
            if (entity === 'kraft' && url.includes('purchases')) {
              tableName = 'ply_purchases';
            } else if (entity === 'duplex' && url.includes('purchases')) {
              tableName = 'duplex_purchases';
            } else if (entity === 'kraft' || entity === 'duplex') {
              // Ignore general stock calculations or other non-purchase writes
              return;
            }

            const recordId = data?.id || pathParts[2] || '';

            // We log the change!
            // In case of update, we try to store oldValues vs newValues
            let oldValues: any = null;
            let newValues = body;

            // Strip sensitive fields like password if logged
            if (newValues) {
              const stripped = { ...newValues };
              delete stripped.password;
              newValues = stripped;
            }

            if (action === 'UPDATE' && recordId) {
              // Try to query the database for the current state before this write (which is not easily possible in post-handler tap, but we can log the update payload itself as newValues)
              // For simplicity, we just store what was sent in the body as newValues.
              // If we wanted to get oldValues, we would need to query it before next.handle() - but since we run in tap (post-write), the DB has already been updated.
              // So we can log the request body as newValues, and we can leave oldValues as a record of changes or we can log what was sent.
            }

            await this.prisma.auditLog.create({
              data: {
                userId: user.id,
                action,
                tenantId: user.tenantId,
                details: JSON.stringify({
                  tableName,
                  recordId,
                  oldValues,
                  newValues,
                }),
              },
            });
          } catch (err) {
            console.error('Failed to create audit log in interceptor:', err);
          }
        },
      }),
    );
  }
}
