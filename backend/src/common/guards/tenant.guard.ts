import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    let tenantId = request['tenantId'];

    if (!tenantId && request.user && request.user.tenantId) {
      request['tenantId'] = request.user.tenantId;
      tenantId = request.user.tenantId;
    }

    if (!tenantId) {
      throw new BadRequestException('Active tenant context is required to access this resource.');
    }

    return true;
  }
}
