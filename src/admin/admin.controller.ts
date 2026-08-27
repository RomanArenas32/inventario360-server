import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { Role } from '../common/enums/role.enum';
import { Plan } from '../common/enums/plan.enum';
import { AdminService } from './admin.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('admin')
@RoleG(Role.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Get('tenants')
  findAllTenants(
    @Query('search') search?: string,
    @Query('plan') plan?: Plan,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.findAllTenants({
      search,
      plan,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.adminService.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }
}
