import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type FindOptionsWhere } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { MessageStatus } from '../../common/enums/message-status.enum';
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
    const where = query.status?.length ? { status: In(query.status) } : {};
    return paginate(this.repo, query, where, 'createdAt');
  }

  findOne(id: string): Promise<ContactMessage | null> {
    return this.repo.findOne({ where: { id } });
  }

  findActiveByContact(email: string, phone?: string): Promise<ContactMessage | null> {
    const activeStatuses = [MessageStatus.Pending, MessageStatus.Read, MessageStatus.Snoozed];

    const where: FindOptionsWhere<ContactMessage>[] = [{ email, status: In(activeStatuses) }];

    if (phone) {
      where.push({ phone, status: In(activeStatuses) });
    }

    return this.repo.findOne({
      where,
      order: { createdAt: 'DESC' },
    });
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
