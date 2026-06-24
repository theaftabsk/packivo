import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Request() req: any, @Body() dto: any) {
    return this.usersService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.usersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.usersService.remove(req.user.tenantId, id, req.user.id);
  }
}
