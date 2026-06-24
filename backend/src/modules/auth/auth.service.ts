import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (user && (await bcrypt.compare(pass, user.password))) {
      // Rejects login if email is not verified
      if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.emailVerified) {
        throw new BadRequestException('Email not verified. Please check your inbox for the verification link.');
      }

      // Rejects login if tenant is suspended
      if (user.role !== 'SUPER_ADMIN' && user.tenant && user.tenant.status === 'SUSPENDED') {
        throw new BadRequestException('Your factory account has been suspended. Please contact support.');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant ? tenant.name : "Packivo Packaging",
        tenantSubdomain: tenant ? tenant.subdomain : "gigani",
      },
    };
  }

  async registerTenant(dto: any) {
    // 1. Password policy check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long, contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.'
      );
    }

    // 2. Email uniqueness check
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email address is already registered.');
    }

    // 3. Create unique subdomain/slug under the hood for DB constraint
    const slugBase = dto.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const autoSubdomain = `${slugBase || 'factory'}-${randomSuffix}`;

    // 4. Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          subdomain: autoSubdomain,
          status: 'TRIAL', // Sets to TRIAL state
          subscriptionStatus: 'TRIAL',
          emailVerified: false,
          verificationToken: token,
          verificationExpires: tokenExpires,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.adminName,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    // 5. Send Verification Email
    const verifyLink = `http://localhost:3000/verify?token=${token}`;
    const mailText = `Hello ${dto.adminName},\n\nThank you for registering your factory: ${dto.companyName}.\n\nPlease verify your email by clicking the link below:\n\n${verifyLink}\n\nThis link is valid for 24 hours. After verification, your 7-day free trial will start automatically.\n\nBest regards,\nPackivo SaaS Team`;
    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Verify Your Factory Account</h2>
        <p>Hello <strong>${dto.adminName}</strong>,</p>
        <p>Thank you for registering <strong>${dto.companyName}</strong> on GIGANI ERP.</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 12px;">This link is valid for 24 hours. If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="color: #4f46e5; font-size: 12px; word-break: break-all;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 11px; text-align: center;">Packivo Operations & Packaging ERP System</p>
      </div>
    `;

    await this.emailService.sendMail(dto.email, 'Verify your GIGANI ERP Account', mailText, mailHtml);

    return {
      success: true,
      message: 'Registration successful! Verification email sent.',
      email: dto.email,
    };
  }

  async verifyEmail(token: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid or expired verification link.');
    }

    if (tenant.verificationExpires && new Date() > tenant.verificationExpires) {
      throw new BadRequestException('Verification link has expired. Please sign up again.');
    }

    // Activate tenant and start 7 days trial
    const now = new Date();
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
        trialStart: now,
        trialEnd: trialEnd,
        status: 'ACTIVE', // Or TRIAL, but ACTIVE lets them log in
        subscriptionStatus: 'TRIAL',
      },
    });

    return {
      success: true,
      message: 'Email verified successfully! Your 7-day free trial has started.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        factory: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    let planDetails = null;
    if (user.tenant && user.tenant.plan) {
      planDetails = await this.prisma.plan.findFirst({
        where: { name: user.tenant.plan },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      ...result,
      planDetails,
    };
  }
}

