/* eslint-disable no-console */
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { BusinessType } from '../common/enums/business-type.enum';
import { Role } from '../common/enums/role.enum';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Tenant],
  synchronize: false,
});

async function createAdmin() {
  await dataSource.initialize();

  const email = process.env.ADMIN_EMAIL ?? 'admin@inventario360.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  const userRepo = dataSource.getRepository(User);
  const tenantRepo = dataSource.getRepository(Tenant);

  const exists = await userRepo.findOne({ where: { email } });
  if (exists) {
    console.log(`El usuario admin ya existe: ${email}`);
    await dataSource.destroy();
    return;
  }

  // The admin requires its own tenant (the platform itself)
  const tenant = tenantRepo.create({
    name: 'Inventario360',
    businessType: BusinessType.Almacen,
    isActive: true,
  });
  await tenantRepo.save(tenant);

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = userRepo.create({
    name,
    email,
    password: hashedPassword,
    role: Role.Admin,
    tenantId: tenant.id,
  });
  await userRepo.save(admin);

  console.log('✓ Usuario admin creado correctamente');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  Cambiá la contraseña en producción.');

  await dataSource.destroy();
}

createAdmin().catch(console.error);
