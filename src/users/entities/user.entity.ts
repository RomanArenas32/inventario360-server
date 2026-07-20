import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { TenantMembership } from '../../tenant-memberships/entities/tenant-membership.entity';

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

  @Column({ type: 'enum', enum: Role, default: Role.User })
  globalRole: Role;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TenantMembership, (m) => m.user)
  memberships: TenantMembership[];

  @CreateDateColumn()
  createdAt: Date;
}
