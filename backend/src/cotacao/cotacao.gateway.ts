import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class CotacaoGateway {
  @WebSocketServer()
  server: Server;

  emitCotacaoUpdate(cotacao: any) {
    this.server.emit('cotacao_updated', cotacao);
  }
}
