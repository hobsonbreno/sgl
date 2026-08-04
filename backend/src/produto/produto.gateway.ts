import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ProdutoGateway {
  @WebSocketServer()
  server: Server;

  emitProdutoUpdate(produto: any) {
    this.server.emit('produto_updated', produto);
  }

  emitProdutoDelete(id: string) {
    this.server.emit('produto_deleted', { id });
  }
}
