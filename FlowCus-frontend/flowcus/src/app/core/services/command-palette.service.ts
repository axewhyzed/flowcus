import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  public isOpen$: Observable<boolean> = this.isOpenSubject.asObservable();

  public open(): void {
    this.isOpenSubject.next(true);
  }

  public close(): void {
    this.isOpenSubject.next(false);
  }

  public toggle(): void {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }
}
