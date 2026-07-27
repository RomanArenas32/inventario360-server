import { Injectable } from '@nestjs/common';
import { MessageStatus } from '../common/enums/message-status.enum';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageRepository } from './repositories/message.repository';

@Injectable()
export class MessagesService {
  constructor(private readonly messageRepository: MessageRepository) {}

  create(dto: CreateMessageDto) {
    return this.messageRepository.create(dto);
  }

  findAll(status?: MessageStatus) {
    return this.messageRepository.findAll(status);
  }

  findOne(id: string) {
    return this.messageRepository.findOne(id);
  }

  update(id: string, dto: UpdateMessageDto) {
    return this.messageRepository.update(id, dto);
  }

  remove(id: string) {
    return this.messageRepository.delete(id);
  }

  countPending() {
    return this.messageRepository.countPending();
  }
}
