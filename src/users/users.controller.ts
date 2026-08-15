import { Body, Controller, HttpCode, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user.type';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SavePushTokenDto } from './dto/save-push-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto.name);
  }

  @Patch('me/password')
  async changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }

  @Post('me/push-token')
  @HttpCode(204)
  async savePushToken(@CurrentUser() user: RequestUser, @Body() dto: SavePushTokenDto) {
    await this.usersService.savePushToken(user.id, dto.token);
  }
}
