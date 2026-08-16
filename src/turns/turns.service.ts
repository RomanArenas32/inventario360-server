import { Injectable } from '@nestjs/common';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnStatusDto } from './dto/update-turn-status.dto';
import { TurnRepository } from './repositories/turn.repository';

@Injectable()
export class TurnsService {
  constructor(private readonly turnRepository: TurnRepository) {}

  findByDate(tenantId: string, date: string) {
    return this.turnRepository.findByDate(tenantId, date);
  }

  create(dto: CreateTurnDto, tenantId: string, userId: string) {
    // Derive the calendar date:
    // - If startTime is provided, extract date part from it.
    // - If queue turn (no startTime), use date from DTO or today.
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
      tenantId,
      assignedUserId: userId,
    });
  }

  async updateStatus(id: string, tenantId: string, dto: UpdateTurnStatusDto) {
    return this.turnRepository.updateStatus(id, tenantId, dto.status);
  }
}
