import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './db/database.module';
import { MachinesModule } from './machines/machines.module';
import { ZonesModule } from './zones/zones.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MachinesModule,
    ZonesModule,
    RealtimeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
