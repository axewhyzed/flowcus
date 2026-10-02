import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DailyRitualService {
  private morningModalSubject = new BehaviorSubject<boolean>(false);
  public morningModal$: Observable<boolean> = this.morningModalSubject.asObservable();

  private eveningModalSubject = new BehaviorSubject<boolean>(false);
  public eveningModal$: Observable<boolean> = this.eveningModalSubject.asObservable();

  private weeklyReviewModalSubject = new BehaviorSubject<boolean>(false);
  public weeklyReviewModal$: Observable<boolean> = this.weeklyReviewModalSubject.asObservable();

  constructor() {}

  public getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  public isMorningKickoffCompletedToday(): boolean {
    return localStorage.getItem(`flowcus_kickoff_${this.getTodayKey()}`) === 'true';
  }

  public isEveningShutdownCompletedToday(): boolean {
    return localStorage.getItem(`flowcus_shutdown_${this.getTodayKey()}`) === 'true';
  }

  public openMorningKickoff(): void {
    this.morningModalSubject.next(true);
  }

  public closeMorningKickoff(): void {
    this.morningModalSubject.next(false);
  }

  public completeMorningKickoff(): void {
    localStorage.setItem(`flowcus_kickoff_${this.getTodayKey()}`, 'true');
    this.closeMorningKickoff();
  }

  public openEveningShutdown(): void {
    this.eveningModalSubject.next(true);
  }

  public closeEveningShutdown(): void {
    this.eveningModalSubject.next(false);
  }

  public completeEveningShutdown(): void {
    localStorage.setItem(`flowcus_shutdown_${this.getTodayKey()}`, 'true');
    this.closeEveningShutdown();
  }

  public openWeeklyReview(): void {
    this.weeklyReviewModalSubject.next(true);
  }

  public closeWeeklyReview(): void {
    this.weeklyReviewModalSubject.next(false);
  }
}
