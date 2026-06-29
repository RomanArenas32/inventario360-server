import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(data: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    tenantId: string;
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: { tenant: true } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: { tenant: true } });
  }
}
