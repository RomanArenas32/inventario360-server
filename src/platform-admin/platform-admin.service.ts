import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAdmin } from './entities/platform-admin.entity';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(PlatformAdmin)
    private readonly repo: Repository<PlatformAdmin>,
  ) {}

  findByEmail(email: string): Promise<PlatformAdmin | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<PlatformAdmin | null> {
    return this.repo.findOne({ where: { id } });
  }
}
