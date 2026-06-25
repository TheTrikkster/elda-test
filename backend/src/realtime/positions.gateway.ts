import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface PositionUpdate {
  machineId: string;
  lng: number;
  lat: number;
  recordedAt: string;
}

/**
 * Socket.IO gateway. The frontend loads the initial state over REST, then
 * subscribes here and receives a `position:update` event each time a machine
 * moves. CORS is permissive in this test setup (tighten via CORS_ORIGIN in
 * production).
 */
@WebSocketGateway({
  cors: { origin: true },
  transports: ['websocket', 'polling'],
})
export class PositionsGateway implements OnGatewayConnection<Socket> {
  private readonly logger = new Logger(PositionsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Client connected: ${client.id}`);
  }

  /** Broadcast a moved machine to every connected client. */
  emitPositionUpdate(update: PositionUpdate) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.server.emit('position:update', update);
  }
}
