import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TurnStatus } from '../../common/enums/turn-status.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

@Entity('turns')
export class Turn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientName: string;

  @Column({ nullable: true })
  clientPhone: string;

  @Column()
  service: string;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date | null;

  // The calendar date this turn belongs to (YYYY-MM-DD).
  // Derived from startTime when present; sent by client for queue turns.
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 30 })
  duration: number;

  @Column({ type: 'enum', enum: TurnStatus, default: TurnStatus.Pending })
  status: TurnStatus;

  @Column({ nullable: true })
  notes: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column({ nullable: true })
  assignedUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  assignedUser: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
