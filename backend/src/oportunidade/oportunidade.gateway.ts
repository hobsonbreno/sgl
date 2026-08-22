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
import { OnModuleInit } from '@nestjs/common';
import { EventsService } from '../events/events.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class OportunidadeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly eventsService: EventsService) {}

  onModuleInit() {
    this.eventsService.getAlertasMonitoramento().subscribe((mensagem) => {
      this.server.emit('alerta_monitoramento', { mensagem });
    });
    
    this.eventsService.getMonitoramentoConcluido().subscribe((dados) => {
      this.server.emit('monitoramento_concluido', dados);
    });
  }

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

  @SubscribeMessage('toggle_column_collapse')
  handleToggleColumnCollapse(
    @MessageBody() data: { colId: string; collapsed: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('kanban_column_collapsed', data);
  }
}
