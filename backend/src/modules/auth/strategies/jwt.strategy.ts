import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const resolvedTenantId = (req as any)['tenantId'];

    // Cross-tenant verification: Prevent Token Hijacking across Tenants
    if (resolvedTenantId && payload.tenantId !== resolvedTenantId) {
      throw new UnauthorizedException('Token is invalid for this tenant context.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}
