import { Body, Controller, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { Role } from '../common/enums/role.enum';
import type { User } from '../users/entities/user.entity';
import { OnboardingDto } from './dto/onboarding.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Patch('onboarding')
  @RoleG(Role.Tenant)
  completeOnboarding(@CurrentUser() user: User, @Body() dto: OnboardingDto) {
    return this.tenantsService.completeOnboarding(user.tenantId, dto.businessType);
  }
}
