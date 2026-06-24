import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/interceptors/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { DuplexModule } from './modules/duplex/duplex.module';
import { PrintingModule } from './modules/printing/printing.module';
import { PrintersModule } from './modules/printers/printers.module';
import { KraftModule } from './modules/kraft/kraft.module';
import { ProductionModule } from './modules/production/production.module';
import { FinishedGoodsModule } from './modules/finished-goods/finished-goods.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ImportsModule } from './modules/imports/imports.module';
import { BillingModule } from './modules/billing/billing.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    VendorsModule,
    CustomersModule,
    ProductsModule,
    DuplexModule,
    PrintingModule,
    PrintersModule,
    KraftModule,
    ProductionModule,
    FinishedGoodsModule,
    DispatchModule,
    ReportsModule,
    DashboardModule,
    SettingsModule,
    ImportsModule,
    BillingModule,
    UsersModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
