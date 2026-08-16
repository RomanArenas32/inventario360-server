import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async updateStatus(id: string, tenantId: string, status: TurnStatus): Promise<Turn> {
    await this.repo.update({ id, tenantId }, { status });
    return this.repo.findOneOrFail({ where: { id } });
  }
}
