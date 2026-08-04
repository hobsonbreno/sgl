import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class FornecedorGateway {
  @WebSocketServer()
  server: Server;

  emitFornecedorUpdate(fornecedor: any) {
    this.server.emit('fornecedor_updated', fornecedor);
  }

  emitFornecedorDelete(id: string) {
    this.server.emit('fornecedor_deleted', { id });
  }
}
