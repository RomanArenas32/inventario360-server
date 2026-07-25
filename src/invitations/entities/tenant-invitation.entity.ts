import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TenantRole } from '../../common/enums/tenant-role.enum';

@Entity('tenant_invitations')
export class TenantInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  email: string;

  @Column()
  tenantId: string;

  @Column({ type: 'enum', enum: TenantRole, default: TenantRole.Owner })
  role: TenantRole;

  @Column()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
