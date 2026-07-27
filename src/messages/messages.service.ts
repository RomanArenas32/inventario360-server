import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../common/dto/paginated-result';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ContactMessage } from './entities/contact-message.entity';
import { MessageRepository } from './repositories/message.repository';

@Injectable()
export class MessagesService {
  constructor(private readonly messageRepository: MessageRepository) {}

  create(dto: CreateMessageDto) {
    return this.messageRepository.create(dto);
  }

  findAll(query: MessageQueryDto): Promise<PaginatedResult<ContactMessage>> {
    return this.messageRepository.findAll(query);
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
