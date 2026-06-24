import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetTenant = createParamDecorator(
  (data: 'id' | 'subdomain' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    let tenant = request['tenant'];

    if (!tenant && request.user && request.user.tenantId) {
      tenant = {
        id: request.user.tenantId,
        subdomain: 'gigani',
        name: 'Packivo Packaging Factory'
      };
    }

    if (!tenant) {
      return null;
    }

    return data ? tenant[data] : tenant;
  },
);
