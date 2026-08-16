import { Injectable } from '@nestjs/common';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnDto } from './dto/update-turn.dto';
import { TurnRepository } from './repositories/turn.repository';

@Injectable()
export class TurnsService {
  constructor(private readonly turnRepository: TurnRepository) {}

  findByDate(tenantId: string, date: string) {
    return this.turnRepository.findByDate(tenantId, date);
  }

  findById(id: string, tenantId: string) {
    return this.turnRepository.findByIdOrFail(id, tenantId);
  }

  findHistory(tenantId: string, search = '', limit = 30, offset = 0) {
    return this.turnRepository.findHistory(tenantId, search, limit, offset);
  }

  create(dto: CreateTurnDto, tenantId: string, userId: string) {
    let date: string;
    if (dto.startTime) {
      date = dto.startTime.split('T')[0]!;
    } else if (dto.date) {
      date = dto.date;
    } else {
      date = new Date().toISOString().split('T')[0]!;
    }

    return this.turnRepository.save({
      clientName: dto.clientName.trim(),
      clientPhone: dto.clientPhone?.trim() || undefined,
      service: dto.service.trim(),
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      date,
      duration: dto.duration,
      notes: dto.notes?.trim() || undefined,
      price: dto.price ?? null,
      tenantId,
      assignedUserId: dto.assignedUserId ?? userId,
    });
  }

  update(id: string, tenantId: string, dto: UpdateTurnDto) {
    let date: string | undefined;
    if (dto.startTime !== undefined) {
      date = dto.startTime ? dto.startTime.split('T')[0] : dto.date;
    } else if (dto.date) {
      date = dto.date;
    }

    const patch: Record<string, unknown> = {};
    if (dto.clientName !== undefined) patch.clientName = dto.clientName.trim();
    if (dto.clientPhone !== undefined) patch.clientPhone = dto.clientPhone?.trim() || null;
    if (dto.service !== undefined) patch.service = dto.service.trim();
    if (dto.startTime !== undefined)
      patch.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (date !== undefined) patch.date = date;
    if (dto.duration !== undefined) patch.duration = dto.duration;
    if (dto.notes !== undefined) patch.notes = dto.notes?.trim() || null;
    if (dto.assignedUserId !== undefined) patch.assignedUserId = dto.assignedUserId;
    if (dto.price !== undefined) patch.price = dto.price;
    if (dto.status !== undefined) patch.status = dto.status;

    return this.turnRepository.update(id, tenantId, patch);
  }
}
