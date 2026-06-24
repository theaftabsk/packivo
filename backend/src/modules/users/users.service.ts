import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: {
          not: 'SUPER_ADMIN',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: any) {
    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot assign SUPER_ADMIN role.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password || 'user123', 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'VIEWER',
        tenantId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot assign SUPER_ADMIN role.');
    }

    const user = await this.prisma.user.findFirst({
      where: { 
        id, 
        tenantId,
        role: {
          not: 'SUPER_ADMIN',
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new BadRequestException('Email already in use.');
      }
    }

    let hashedPassword = user.password;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      },
    });
  }

  async remove(tenantId: string, id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.prisma.user.findFirst({
      where: { 
        id, 
        tenantId,
        role: {
          not: 'SUPER_ADMIN',
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
