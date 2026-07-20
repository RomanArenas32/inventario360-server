import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { AddMemberDto } from './dto/add-member.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Patch('onboarding')
  @RoleG(TenantRole.Owner)
  completeOnboarding(@CurrentUser() user: RequestUser, @Body() dto: OnboardingDto) {
    return this.tenantsService.completeOnboarding(user.activeTenantId!, dto.businessType);
  }

  @Get('members')
  @RoleG(TenantRole.Owner)
  getMembers(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getMembers(user.activeTenantId!);
  }

  @Post('members')
  @RoleG(TenantRole.Owner)
  addMember(@CurrentUser() user: RequestUser, @Body() dto: AddMemberDto) {
    return this.tenantsService.addMember(user.activeTenantId!, dto);
  }

  @Patch('members/:userId')
  @RoleG(TenantRole.Owner)
  updateMemberRole(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.tenantsService.updateMemberRole(user.activeTenantId!, userId, dto.role);
  }

  @Delete('members/:userId')
  @RoleG(TenantRole.Owner)
  removeMember(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.tenantsService.removeMember(user.activeTenantId!, userId);
  }
}
