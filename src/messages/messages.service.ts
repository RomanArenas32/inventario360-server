import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageStatus } from '../common/enums/message-status.enum';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ContactMessage } from './entities/contact-message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repo: Repository<ContactMessage>,
  ) {}

  create(dto: CreateMessageDto): Promise<ContactMessage> {
    const message = this.repo.create(dto);
    return this.repo.save(message);
  }

  findAll(status?: MessageStatus): Promise<ContactMessage[]> {
    const where = status ? { status } : {};
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<ContactMessage | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateMessageDto): Promise<ContactMessage> {
    await this.repo.update(id, dto);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  countPending(): Promise<number> {
    return this.repo.count({ where: { status: MessageStatus.Pending } });
  }
}
