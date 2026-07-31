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

  @UpdateDateColumn()
  updatedAt: Date;
}
