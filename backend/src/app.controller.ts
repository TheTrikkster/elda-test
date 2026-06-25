import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** Simple health check. */
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
