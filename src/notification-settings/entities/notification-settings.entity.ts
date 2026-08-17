import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  whatsappPhone: string | null;

  @Column({ default: false })
  whatsappOptIn: boolean;

  @Column({ default: true })
  alertLowStock: boolean;

  @Column({ default: true })
  alertNewSale: boolean;

  @Column({ default: true })
  alertTurnAssigned: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
