import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class OportunidadeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  emitOportunidadeUpdate(oportunidade: any) {
    this.server.emit('oportunidade_updated', oportunidade);
  }

  emitOportunidadeDelete(id: string) {
    this.server.emit('oportunidade_deleted', { id });
  }

  @SubscribeMessage('toggle_card_collapse')
  handleToggleCardCollapse(
    @MessageBody() data: { cardId: string; collapsed: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast para todo mundo, EXCETO para quem enviou
    client.broadcast.emit('kanban_card_collapsed', data);
  }
}
