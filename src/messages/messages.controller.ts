import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RoleG } from '../common/decorators/role-guard.decorator';
import { MessageStatus } from '../common/enums/message-status.enum';
import { Role } from '../common/enums/role.enum';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }

  @Get()
  @RoleG(Role.Admin)
  findAll(@Query('status') status?: MessageStatus) {
    return this.messagesService.findAll(status);
  }

  @Get('pending-count')
  @RoleG(Role.Admin)
  countPending() {
    return this.messagesService.countPending();
  }

  @Patch(':id')
  @RoleG(Role.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(id, dto);
  }

  @Delete(':id')
  @RoleG(Role.Admin)
  remove(@Param('id') id: string) {
    return this.messagesService.remove(id);
  }
}
