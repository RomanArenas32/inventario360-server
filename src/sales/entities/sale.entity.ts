import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit: number;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.Cash })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0 })
  itemCount: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
