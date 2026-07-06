import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
// import { Role } from '../common/enums/role.enum';
// import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
// import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    // private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
  ) {}

  // async register(dto: RegisterDto) {
  //   const existing = await this.usersService.findByEmail(dto.email);
  //   if (existing) throw new ConflictException('Email already registered');

  //   const tenant = await this.tenantsService.create(dto.businessName, dto.businessType);

  //   const hashedPassword = await bcrypt.hash(dto.password, 10);
  //   const user = await this.usersService.create({
  //     name: dto.name,
  //     email: dto.email,
  //     password: hashedPassword,
  //     role: Role.Tenant,
  //     tenantId: tenant.id,
  //   });

  //   return this.buildResponse(user.id, user.email, tenant.id, user.role);
  // }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Credenciales inválidas');
    if (!user.isActive) throw new UnauthorizedException('Usuario inactivo');
    return this.buildResponse(user.id, user.email, user.tenantId, user.role);
  }
  private buildResponse(userId: string, email: string, tenantId: string, role: string) {
    const token = this.jwtService.sign({ sub: userId, email, tenantId, role });
    return { access_token: token };
  }
}
