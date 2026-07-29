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

  async create(dto: CreateMessageDto): Promise<{ received: true }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const phoneDigits = dto.phone?.replace(/\D/g, '');
    const normalizedPhone = phoneDigits ? `+${phoneDigits}` : undefined;

    const existingRequest = await this.messageRepository.findActiveByContact(
      normalizedEmail,
      normalizedPhone,
    );

    if (!existingRequest) {
      await this.messageRepository.create({
        ...dto,
        name: dto.name.trim(),
        email: normalizedEmail,
        businessType: dto.businessType.trim(),
        phone: normalizedPhone,
        message: dto.message.trim(),
      });
    }

    return { received: true };
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
