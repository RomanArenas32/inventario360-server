import { Injectable } from '@nestjs/common';
import { PlatformAdminRepository } from './repositories/platform-admin.repository';

@Injectable()
export class PlatformAdminService {
  constructor(private readonly platformAdminRepository: PlatformAdminRepository) {}

  findByEmail(email: string) {
    return this.platformAdminRepository.findByEmail(email);
  }

  findById(id: string) {
    return this.platformAdminRepository.findById(id);
  }
}
