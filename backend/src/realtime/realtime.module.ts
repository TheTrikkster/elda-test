import { Module } from '@nestjs/common';
import { PositionsGateway } from './positions.gateway';
import { SimulatorService } from './simulator.service';

@Module({
  providers: [PositionsGateway, SimulatorService],
})
export class RealtimeModule {}
