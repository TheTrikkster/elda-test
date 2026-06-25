import { Controller, Get, Param, Query } from '@nestjs/common';
import { MachinesService } from './machines.service';

@Controller('machines')
export class MachinesController {
  constructor(private readonly machines: MachinesService) {}

  /** GET /machines — list machines with their last known position. */
  @Get()
  findAll() {
    return this.machines.findAllWithLastPosition();
  }

  /** GET /machines/:id/track — full ordered trace. */
  @Get(':id/track')
  getTrack(@Param('id') id: string) {
    return this.machines.getTrack(id);
  }

  /** GET /machines/:id/distance-in-zone?zoneId=test-zone — metres inside the zone. */
  @Get(':id/distance-in-zone')
  distanceInZone(
    @Param('id') id: string,
    @Query('zoneId') zoneId = 'test-zone',
  ) {
    return this.machines.distanceInZone(id, zoneId);
  }
}
