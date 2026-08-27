import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateServiceDto } from '../dto/create-service.dto';
import type { UpdateServiceDto } from '../dto/update-service.dto';
import { Service } from '../entities/service.entity';

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
  ) {}

  create(dto: CreateServiceDto, tenantId: string): Promise<Service> {
    const service = this.repo.create({ ...dto, tenantId });
    return this.repo.save(service);
  }

  findAll(tenantId: string, search?: string): Promise<Service[]> {
    const qb = this.repo
      .createQueryBuilder('service')
      .where('service.tenantId = :tenantId', { tenantId })
      .orderBy('service.name', 'ASC');

    if (search) {
      qb.andWhere('LOWER(service.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  findOne(id: string, tenantId: string): Promise<Service | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async update(id: string, dto: UpdateServiceDto, tenantId: string): Promise<Service | null> {
    await this.repo.update({ id, tenantId }, dto);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }
}
