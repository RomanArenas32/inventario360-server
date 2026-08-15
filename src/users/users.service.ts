import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  create(data: {
    name: string;
    email: string;
    password?: string | null;
    globalRole?: Role;
    avatarUrl?: string | null;
  }) {
    return this.userRepository.create(data);
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  async updateProfile(id: string, name: string): Promise<{ id: string; name: string }> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.userRepository.update(id, { name });
    return { id, name };
  }

  upsertAvatar(id: string, avatarUrl: string) {
    return this.userRepository.update(id, { avatarUrl });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.password) throw new UnauthorizedException('Esta cuenta usa Google para autenticarse');
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new UnauthorizedException('Contraseña actual incorrecta');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(id, { password: hashed });
  }

  savePushToken(id: string, token: string | null) {
    return this.userRepository.update(id, { expoPushToken: token });
  }

  deactivate(id: string) {
    return this.userRepository.update(id, { isActive: false });
  }

  reactivate(id: string) {
    return this.userRepository.update(id, { isActive: true });
  }
}
