import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { paginate } from '../../common/utils/paginate.util';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessageQueryDto } from '../dto/message-query.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { ContactMessage } from '../entities/contact-message.entity';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repo: Repository<ContactMessage>,
  ) {}

  create(dto: CreateMessageDto): Promise<ContactMessage> {
    const message = this.repo.create(dto);
    return this.repo.save(message);
  }

  findAll(query: MessageQueryDto): Promise<PaginatedResult<ContactMessage>> {
    const where = query.status ? { status: query.status } : {};
    return paginate(this.repo, query, where, 'createdAt');
  }

  findOne(id: string): Promise<ContactMessage | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateMessageDto): Promise<ContactMessage> {
    await this.repo.update(id, dto);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  countPending(): Promise<number> {
    return this.repo.count({ where: { status: 'pending' as ContactMessage['status'] } });
  }
}
