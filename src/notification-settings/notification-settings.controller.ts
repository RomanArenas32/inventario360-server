import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { TenantRole } from '../common/enums/tenant-role.enum';
import type { RequestUser } from '../common/types/request-user.type';
import { UpsertNotificationSettingsDto } from './dto/upsert-notification-settings.dto';
import { NotificationSettingsService } from './notification-settings.service';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(private readonly service: NotificationSettingsService) {}

  @Get()
  @RoleG(TenantRole.Owner)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.service.getSettings(user.activeTenantId!);
  }

  @Put()
  @RoleG(TenantRole.Owner)
  upsertSettings(@CurrentUser() user: RequestUser, @Body() dto: UpsertNotificationSettingsDto) {
    return this.service.upsertSettings(user.activeTenantId!, dto);
  }
}
