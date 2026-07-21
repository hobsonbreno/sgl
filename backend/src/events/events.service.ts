import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventsService {
  private updateSubject = new Subject<void>();

  emitDashboardUpdate() {
    this.updateSubject.next();
  }

  getDashboardUpdates() {
    return this.updateSubject.asObservable();
  }
}
