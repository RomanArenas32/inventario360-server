import { Controller, Delete, Get, HttpCode, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user.type';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  getAll(@CurrentUser() user: RequestUser) {
    return this.service.getAll(user.activeTenantId!);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: RequestUser) {
    return this.service.getUnreadCount(user.activeTenantId!);
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() user: RequestUser) {
    await this.service.markAllRead(user.activeTenantId!);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.service.markRead(id, user.activeTenantId!);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.service.delete(id, user.activeTenantId!);
  }
}
