import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessType } from '../../common/enums/business-type.enum';
import { Plan } from '../../common/enums/plan.enum';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: BusinessType, nullable: true })
  businessType: BusinessType;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: Plan, default: Plan.Basic })
  plan: Plan;

  @Column({ default: false })
  isOnboarded: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;
}
