import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { CommonModule } from './common/common.module';
import { RolesGuard } from './common/guards/roles.guard';
import { InvitationsModule } from './invitations/invitations.module';
import { MailModule } from './mail/mail.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { ServicesModule } from './services/services.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { TenantMembershipsModule } from './tenant-memberships/tenant-memberships.module';
import { TenantsModule } from './tenants/tenants.module';
import { TurnsModule } from './turns/turns.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 60 }, // 60 req/min globally
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        ...(config.get<string>('DB_SSL') === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
      }),
      inject: [ConfigService],
    }),
    AdminModule,
    AuthModule,
    MessagesModule,
    NotificationSettingsModule,
    NotificationsModule,
    WhatsAppModule,
    CategoriesModule,
    CommonModule,
    InvitationsModule,
    MailModule,
    PlatformAdminModule,
    ProductsModule,
    SalesModule,
    ServicesModule,
    StockMovementsModule,
    TenantMembershipsModule,
    TurnsModule,
    UsersModule,
    TenantsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
