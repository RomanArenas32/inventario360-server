import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
@RoleG(TenantRole.Owner, TenantRole.Staff)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RoleG(TenantRole.Owner)
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: RequestUser) {
    return this.servicesService.create(dto, user.activeTenantId!);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    return this.servicesService.findAll(user.activeTenantId!, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.servicesService.findOne(id, user.activeTenantId!);
  }

  @Patch(':id')
  @RoleG(TenantRole.Owner)
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @CurrentUser() user: RequestUser) {
    return this.servicesService.update(id, dto, user.activeTenantId!);
  }

  @Delete(':id')
  @RoleG(TenantRole.Owner)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.servicesService.remove(id, user.activeTenantId!);
  }
}
