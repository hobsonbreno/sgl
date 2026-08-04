import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class FinanceiroGateway {
  @WebSocketServer()
  server: Server;

  emitFinanceiroUpdate() {
    this.server.emit('financeiro_updated', { timestamp: new Date() });
  }
}
