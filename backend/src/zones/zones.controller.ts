import { Controller, Get, Param } from '@nestjs/common';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  /** GET /zones — list zones as GeoJSON. */
  @Get()
  findAll() {
    return this.zones.findAll();
  }

  /** GET /zones/:id/machines — machines currently inside the zone. */
  @Get(':id/machines')
  machinesInZone(@Param('id') id: string) {
    return this.zones.machinesInZone(id);
  }
}
