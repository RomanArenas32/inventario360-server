import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.Tenant })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
