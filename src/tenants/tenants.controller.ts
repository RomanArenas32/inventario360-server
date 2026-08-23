import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { AddMemberDto } from './dto/add-member.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateMemberDto } from './dto/update-member-role.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Patch('onboarding')
  @RoleG(TenantRole.Owner)
  completeOnboarding(@CurrentUser() user: RequestUser, @Body() dto: OnboardingDto) {
    return this.tenantsService.completeOnboarding(user.activeTenantId!, dto.businessType as never, {
      businessName: dto.businessName,
      phone: dto.phone,
    });
  }

  @Get('members')
  @RoleG(TenantRole.Owner)
  getMembers(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('role') role?: TenantRole,
  ) {
    return this.tenantsService.getMembers(user.activeTenantId!, { search, role });
  }

  @Get('invitations/pending')
  @RoleG(TenantRole.Owner)
  getPendingInvitations(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getPendingInvitations(user.activeTenantId!);
  }

  @Delete('invitations/pending/:invitationId')
  @RoleG(TenantRole.Owner)
  revokeInvitation(@CurrentUser() user: RequestUser, @Param('invitationId') invitationId: string) {
    return this.tenantsService.revokeInvitation(user.activeTenantId!, invitationId);
  }

  @Post('members')
  @RoleG(TenantRole.Owner)
  addMember(@CurrentUser() user: RequestUser, @Body() dto: AddMemberDto) {
    return this.tenantsService.addMember(user.activeTenantId!, dto);
  }

  @Patch('members/:userId')
  @RoleG(TenantRole.Owner)
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.tenantsService.updateMember(user.activeTenantId!, userId, dto);
  }

  @Delete('members/:userId')
  @RoleG(TenantRole.Owner)
  removeMember(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    return this.tenantsService.removeMember(user.activeTenantId!, userId);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  @Get('settings')
  @RoleG(TenantRole.Owner)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.tenantsService.getSettings(user.activeTenantId!);
  }

  @Patch('settings')
  @RoleG(TenantRole.Owner)
  async updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() body: { businessType?: string; name?: string },
  ) {
    const tasks: Promise<unknown>[] = [];
    if (body.businessType)
      tasks.push(this.tenantsService.updateBusinessType(user.activeTenantId!, body.businessType));
    if (body.name) tasks.push(this.tenantsService.updateName(user.activeTenantId!, body.name));
    await Promise.all(tasks);
    return { ok: true };
  }

  @Patch('staff-modules')
  @RoleG(TenantRole.Owner)
  updateStaffModules(@CurrentUser() user: RequestUser, @Body() body: { modules: string[] | null }) {
    return this.tenantsService.updateStaffModules(user.activeTenantId!, body.modules);
  }
}
