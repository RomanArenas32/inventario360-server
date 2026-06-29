import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  tenant: Tenant;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;
}
