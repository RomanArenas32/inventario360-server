import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PaginatedResult } from '../../common/dto/paginated-result';
import { TurnStatus } from '../../common/enums/turn-status.enum';
import { Turn } from '../entities/turn.entity';

@Injectable()
export class TurnRepository {
  constructor(
    @InjectRepository(Turn)
    private readonly repo: Repository<Turn>,
  ) {}

  findByDate(tenantId: string, date: string): Promise<Turn[]> {
    return this.repo
      .createQueryBuilder('turn')
      .leftJoin('turn.assignedUser', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('turn.tenantId = :tenantId', { tenantId })
      .andWhere('turn.date = :date', { date })
      .orderBy('turn.startTime', 'ASC', 'NULLS LAST')
      .addOrderBy('turn.createdAt', 'ASC')
      .getMany();
  }

  save(data: Partial<Turn>): Promise<Turn> {
    const turn = this.repo.create(data);
    return this.repo.save(turn);
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<Turn> {
    const turn = await this.repo.findOne({ where: { id, tenantId } });
    if (!turn) throw new NotFoundException('Turno no encontrado');
    return turn;
  }

  async update(id: string, tenantId: string, data: Partial<Turn>): Promise<Turn> {
    await this.repo.update({ id, tenantId }, data);
    const turn = await this.repo
      .createQueryBuilder('turn')
      .leftJoin('turn.assignedUser', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('turn.id = :id', { id })
      .getOne();
    if (!turn) throw new NotFoundException('Turno no encontrado');
    return turn;
  }

  async findHistory(
    tenantId: string,
    search: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Turn>> {
    const qb = this.repo
      .createQueryBuilder('turn')
      .leftJoin('turn.assignedUser', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('turn.tenantId = :tenantId', { tenantId })
      .orderBy('turn.date', 'DESC')
      .addOrderBy('turn.startTime', 'ASC', 'NULLS LAST');

    if (search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(turn.clientName) LIKE :s OR LOWER(turn.service) LIKE :s OR LOWER(COALESCE(turn.clientPhone, '')) LIKE :s)",
        { s },
      );
    }

    qb.skip(offset).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset, hasMore: offset + data.length < total };
  }

  async updateStatus(id: string, tenantId: string, status: TurnStatus): Promise<Turn> {
    await this.repo.update({ id, tenantId }, { status });
    return this.repo.findOneOrFail({ where: { id } });
  }
}
