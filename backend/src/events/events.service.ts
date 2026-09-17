import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventsService {
  private updateSubject = new Subject<void>();
  private alertaMonitoramentoSubject = new Subject<string>();
  private monitoramentoConcluidoSubject = new Subject<any>();

  emitDashboardUpdate() {
    this.updateSubject.next();
  }

  getDashboardUpdates() {
    return this.updateSubject.asObservable();
  }

  emitirAlertaMonitoramento(mensagem: string) {
    this.alertaMonitoramentoSubject.next(mensagem);
  }

  getAlertasMonitoramento() {
    return this.alertaMonitoramentoSubject.asObservable();
  }

  emitirMonitoramentoConcluido(dados: any) {
    this.monitoramentoConcluidoSubject.next(dados);
  }

  getMonitoramentoConcluido() {
    return this.monitoramentoConcluidoSubject.asObservable();
  }
}
