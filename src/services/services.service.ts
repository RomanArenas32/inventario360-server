import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceRepository } from './repositories/service.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  create(dto: CreateServiceDto, tenantId: string) {
    return this.serviceRepository.create(dto, tenantId);
  }

  findAll(tenantId: string, search?: string) {
    return this.serviceRepository.findAll(tenantId, search);
  }

  async findOne(id: string, tenantId: string) {
    const service = await this.serviceRepository.findOne(id, tenantId);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return service;
  }

  async update(id: string, dto: UpdateServiceDto, tenantId: string) {
    const service = await this.serviceRepository.update(id, dto, tenantId);
    if (!service) throw new NotFoundException('Servicio no encontrado');
    return service;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.serviceRepository.remove(id, tenantId);
  }
}
