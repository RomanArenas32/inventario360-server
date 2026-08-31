/* eslint-disable no-console */
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { PlatformAdmin } from '../platform-admin/entities/platform-admin.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [PlatformAdmin],
  synchronize: true,
});

async function createAdmin() {
  await dataSource.initialize();

  const email = process.env.ADMIN_EMAIL ?? 'admin@inventario360.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.ADMIN_NAME ?? 'Administrador';
  const shouldResetPassword = process.argv.includes('--reset-password');

  const repo = dataSource.getRepository(PlatformAdmin);

  const exists = await repo.findOne({ where: { email } });
  if (exists) {
    if (!shouldResetPassword) {
      await dataSource.destroy();
      return;
    }

    exists.password = await bcrypt.hash(password, 10);
    exists.isActive = true;
    await repo.save(exists);
    await dataSource.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = repo.create({ name, email, password: hashedPassword });
  await repo.save(admin);
  await dataSource.destroy();
}

createAdmin().catch(console.error);
